const SteamUser = require('steam-user');
const express = require('express');
const cron = require('node-cron');

const client = new SteamUser();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// ⚠️ WKLEJ TUTAJ SWÓJ REFRESH TOKEN ⚠️
const REFRESH_TOKEN = 'eyAidHlwIjogIkpXVCIsICJhbGciOiAiRWREU0EiIH0.eyAiaXNzIjogInN0ZWFtIiwgInN1YiI6ICI3NjU2MTE5ODEwMTA5MjE3NCIsICJhdWQiOiBbICJjbGllbnQiLCAid2ViIiwgInJlbmV3IiwgImRlcml2ZSIgXSwgImV4cCI6IDE4MDYxNjA5NzgsICJuYmYiOiAxNzc5Mjg4MzEyLCAiaWF0IjogMTc4NzkyODMxMiwgImp0aSI6ICIwMDE2XzI4QjdCQTNEX0RDNTNCIiwgIm9hdCI6IDE3ODc5MjgzMTIsICJwZXIiOiAxLCAiaXBfc3ViamVjdCI6ICI5MS4yNDQuMjIxLjIzIiwgImlwX2NvbmZpcm1lciI6ICI5MS4yNDQuMjIxLjIzIiB9.o82SHTGQATb8lciDzouxCHx7xJrmVLx3LfrQ_GuRRJr4DU0_jeM9u_z2ycAE-AuguPdKqw2qlqj2Rn-oB28kBA';

let currentStatus = 'OFFLINE';
let currentGame = 'Brak';

let autoOffTime = '03:30';
let autoOffEnabled = true;
let cronTask = null;

function connectToSteam() {
    console.log('🔄 Łączenie ze Steam...');
    client.logOn({ refreshToken: REFRESH_TOKEN });
}

connectToSteam();

client.on('loggedOn', () => {
    console.log('✅ Zalogowano pomyślnie do Steam!');
    client.setPersona(SteamUser.EPersonaState.Online);
    currentStatus = 'ONLINE';
    
    if (currentGame === 'Counter-Strike 2') {
        client.gamesPlayed([730]);
    } else if (currentGame !== 'Brak') {
        client.gamesPlayed([currentGame]);
    }

    updateNightlySchedule(autoOffTime);
});

client.on('disconnected', (result, msg) => {
    console.warn(`⚠️ Rozłączono ze Steam (${msg}). Próba ponownego połączenia za 15 sekund...`);
    currentStatus = 'OFFLINE';
    setTimeout(() => {
        connectToSteam();
    }, 15000);
});

client.on('error', (err) => {
    console.error('❌ Błąd Steam:', err.message);
    setTimeout(() => {
        connectToSteam();
    }, 60000);
});

function updateNightlySchedule(timeString) {
    if (cronTask) cronTask.stop();

    if (!autoOffEnabled) {
        console.log('🌙 [AUTO-OFFLINE] Wyłącznik automatyczny WYŁĄCZONY.');
        return;
    }

    const [hours, minutes] = timeString.split(':');
    
    cronTask = cron.schedule(`${minutes} ${hours} * * *`, () => {
        console.log(`⏰ [CRON] Wybiła godzina ${timeString}! Wyłączam status...`);

        if (currentStatus === 'ONLINE') {
            client.setPersona(SteamUser.EPersonaState.Invisible);
            client.gamesPlayed([]);
            currentStatus = 'OFFLINE';
            currentGame = 'Brak';
            console.log('🌙 [AUTO-OFFLINE] Przełączono na Niewidoczny.');
        }
    }, {
        scheduled: true,
        timezone: "Europe/Warsaw"
    });

    console.log(`⏰ [AUTO-OFFLINE] Ustawiono wyłącznik na dokładnie: ${timeString} (Europe/Warsaw)`);
}

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Steam Online Bot</title>
            <style>
                body { font-family: sans-serif; background: #1b2838; color: #fff; text-align: center; padding: 30px 15px; }
                .card { background: #171a21; max-width: 420px; margin: 0 auto; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                h1 { font-size: 22px; margin-bottom: 20px; }
                .status { font-size: 16px; font-weight: bold; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
                .online { background: #5c7e10; color: #beee11; }
                .offline { background: #a34c4c; color: #ffadad; }
                .game-info { background: #2a475e; color: #66c0f4; padding: 8px; border-radius: 5px; margin-bottom: 20px; font-size: 14px; }
                .btn { display: inline-block; width: 85%; padding: 12px; margin: 6px 0; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 15px; }
                .btn-on { background: #66c0f4; color: #fff; }
                .btn-off { background: #3b424a; color: #c6d4df; }
                .btn-game { background: #a4d007; color: #1b2838; }
                .btn-save { background: #47b147; color: #fff; margin-top: 10px; width: 50%; padding: 8px; }
                .auto-box { background: #0e141d; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center; }
                input[type="time"] { padding: 6px 10px; border-radius: 5px; border: 1px solid #2a475e; background: #1b2838; color: #fff; font-size: 16px; font-weight: bold; }
                hr { border: 0; height: 1px; background: #2a475e; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🎮 Panel Steam Bot</h1>
                
                <div class="status ${currentStatus === 'ONLINE' ? 'online' : 'offline'}">
                    Status: ${currentStatus}
                </div>
                <div class="game-info">
                    Włączona gra: <b>${currentGame}</b>
                </div>

                <a href="/set/online" class="btn btn-on">🟢 Ustaw ONLINE</a>
                <a href="/set/offline" class="btn btn-off">🔴 Ustaw OFFLINE</a>

                <hr>

                <h3>Ustaw widoczną grę:</h3>
                <a href="/game/cs2" class="btn btn-game">🎮 Counter-Strike 2</a>
                <a href="/game/custom" class="btn btn-game">✏️ Własna nazwa gry</a>
                <a href="/game/none" class="btn btn-off">❌ Wyłącz grę</a>

                <hr>

                <div class="auto-box">
                    <h3>🌙 Automatyczny Wyłącznik</h3>
                    <p style="font-size: 13px; color: #8f98a0; margin-bottom: 12px;">
                        Stan: <b>${autoOffEnabled ? '🟢 Aktywny (' + autoOffTime + ')' : '🔴 Wyłączony'}</b>
                    </p>
                    
                    <form action="/set-autoff" method="POST">
                        <label style="font-size: 14px;">Wybierz dokładną godzinę wyłączenia:<br><br></label>
                        <input type="time" name="time" value="${autoOffTime}" required>
                        <br>
                        <button type="submit" class="btn btn-save">Zapisz godzinę</button>
                    </form>
                    <br>
                    <a href="/toggle-autoff" style="font-size: 12px; color: #66c0f4; text-decoration: underline;">
                        ${autoOffEnabled ? 'Wyłącz automat całkowicie' : 'Włącz automat z powrotem'}
                    </a>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/set-autoff', (req, res) => {
    const newTime = req.body.time;
    if (newTime) {
        autoOffTime = newTime;
        autoOffEnabled = true;
        updateNightlySchedule(autoOffTime);
    }
    res.redirect('/');
});

app.get('/toggle-autoff', (req, res) => {
    autoOffEnabled = !autoOffEnabled;
    updateNightlySchedule(autoOffTime);
    res.redirect('/');
});

app.get('/set/online', (req, res) => {
    client.setPersona(SteamUser.EPersonaState.Online);
    currentStatus = 'ONLINE';
    res.redirect('/');
});

app.get('/set/offline', (req, res) => {
    client.setPersona(SteamUser.EPersonaState.Invisible);
    client.gamesPlayed([]);
    currentStatus = 'OFFLINE';
    currentGame = 'Brak';
    res.redirect('/');
});

app.get('/game/cs2', (req, res) => {
    if (!client.steamID) connectToSteam();
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed([730]); 
    currentStatus = 'ONLINE';
    currentGame = 'Counter-Strike 2';
    res.redirect('/');
});

app.get('/game/custom', (req, res) => {
    if (!client.steamID) connectToSteam();
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed(['Uczę się programować']); 
    currentStatus = 'ONLINE';
    currentGame = 'Uczę się programować';
    res.redirect('/');
});

app.get('/game/none', (req, res) => {
    client.gamesPlayed([]);
    currentGame = 'Brak';
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`🌐 Panel sterowania działa na porcie ${PORT}`);
});
