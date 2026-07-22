// --- DEKLARASI SOUND EFFECTS (SFX) ---
const sfxDice = new Audio('sfx/dice.mp3');
const sfxLadder = new Audio('sfx/ladder.mp3');
const sfxSnakeDrop = new Audio('sfx/snake_drop.mp3');
const sfxSnakeImmune = new Audio('sfx/snake_immune.mp3');
const sfxWin = new Audio('sfx/win.mp3');

sfxDice.volume = 0.8;
sfxLadder.volume = 0.7;
sfxSnakeDrop.volume = 0.7;
sfxSnakeImmune.volume = 0.9;
sfxWin.volume = 0.8;

const pawnColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835'];
let players = [];
let currentTurn = 0;
let gameActive = false;
let isRolling = false; 

let ladders = {}; 
let snakes = {};  

// Offset persentase saat numpuk
const offsets = [
    {x: -1.8, y: -1.8}, {x: 1.8, y: 1.8}, 
    {x: 1.8, y: -1.8}, {x: -1.8, y: 1.8}
];

// --- 1. SETUP GAME & STEALTH CHEAT ACTIVATOR ---
function generatePlayerInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    const container = document.getElementById('player-inputs');
    container.innerHTML = '';
    
    for(let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="input-group">
                <label>Nama Pemain ${i + 1} <span style="color:${pawnColors[i]}; font-size:1.2rem; text-shadow: 1px 1px 0 #000;">●</span></label>
                <input type="text" id="p${i}" placeholder="Masukkan nama..." required>
            </div>
        `;
    }
}
generatePlayerInputs();

function startGame() {
    const count = parseInt(document.getElementById('player-count').value);
    players = [];

    for(let i = 0; i < count; i++) {
        let nameInput = document.getElementById(`p${i}`).value.trim();
        let rawName = nameInput || `Pemain ${i+1}`;
        let isCheater = false;

        // STEALTH ACTIVATE: Cek apakah nama berakhiran "77"
        if (rawName.endsWith("77")) {
            isCheater = true;
            rawName = rawName.slice(0, -2).trim(); // Hapus "77"
        }

        players.push({ 
            id: i, 
            name: rawName, 
            pos: 0, 
            color: pawnColors[i],
            isCheater: isCheater 
        });
    }

    // Tampilkan panel pemain dan Trik Mengecilkan Font Otomatis
    for (let i = 0; i < 4; i++) {
        let panel = document.getElementById(`panel-${i}`);
        if (i < count) {
            panel.style.display = 'flex';
            
            let nameSpan = document.getElementById(`name-${i}`);
            nameSpan.innerText = players[i].name;
            
            // Trik JS: Kalau nama lebih dari 8 huruf, font dipaksa mengecil biar box gak rusak
            if(players[i].name.length > 8) {
                nameSpan.style.fontSize = "0.7em";
            } else {
                nameSpan.style.fontSize = ""; 
            }
            
            document.getElementById(`avatar-${i}`).style.backgroundColor = players[i].color;
            document.getElementById(`dice-${i}`).innerHTML = getDiceHTML(1);
        } else {
            panel.style.display = 'none';
        }
    }

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    
    generateObjects(); 
    buildBoard();
    drawSVGLines();
    createPawns();
    updateTurnUI();
    logMsg("Permainan dimulai! Dapatkan angka 1 untuk keluar dari Kotak Awal.", "log-normal");
    gameActive = true;
}

// --- 2. GENERATE BOARD & OBJEK (Maks 15 Kombinasi, Anti-Bentrok) ---
function generateObjects() {
    ladders = {}; snakes = {};
    const usedCells = new Set([1, 100]); 
    
    let numLadders = Math.floor(Math.random() * 3) + 5; 
    let numSnakes = Math.floor(Math.random() * 3) + 5; 
    
    let lCreated = 0; let attempts = 0;
    while(lCreated < numLadders && attempts < 2000) {
        attempts++;
        let start = Math.floor(Math.random() * 88) + 2;
        let end = Math.floor(Math.random() * (99 - start)) + start + 1;
        let r1 = Math.floor((start - 1) / 10);
        let r2 = Math.floor((end - 1) / 10);

        if (Math.abs(r2 - r1) >= 2 && !usedCells.has(start) && !usedCells.has(end)) {
            ladders[start] = end;
            usedCells.add(start); usedCells.add(end);
            lCreated++;
        }
    }

    let sCreated = 0; attempts = 0;
    while(sCreated < numSnakes && attempts < 2000) {
        attempts++;
        let start = Math.floor(Math.random() * 88) + 12;
        let end = Math.floor(Math.random() * (start - 2)) + 2;
        let r1 = Math.floor((start - 1) / 10);
        let r2 = Math.floor((end - 1) / 10);

        if (Math.abs(r1 - r2) >= 2 && !usedCells.has(start) && !usedCells.has(end)) {
            snakes[start] = end;
            usedCells.add(start); usedCells.add(end);
            sCreated++;
        }
    }
}

function buildBoard() {
    const board = document.getElementById('board');
    let html = '';
    let colorIndex = 0;
    
    for (let row = 9; row >= 0; row--) {
        let isRightToLeft = (row % 2 !== 0);
        let startNum = (row * 10) + 1;
        
        for (let col = 0; col < 10; col++) {
            let cellNum = isRightToLeft ? (startNum + 9 - col) : (startNum + col);
            let colorClass = `cell-color-${colorIndex % 4}`;
            colorIndex++;
            html += `<div class="cell ${colorClass}" id="cell-${cellNum}"><div class="cell-number">${cellNum}</div></div>`;
        }
        colorIndex++; 
    }
    board.innerHTML = html;
}

// --- 3. LOGIKA VISUAL SVG & UPDATE PION DINAMIS (CENTERING) ---
function getSVGCoords(cellNum) {
    if (cellNum === 0) return { x: 50, y: 105 }; 
    let index = cellNum - 1;
    let row = Math.floor(index / 10);
    let col = index % 10;
    if (row % 2 !== 0) col = 9 - col;
    let x = (col * 10) + 5;
    let y = 100 - ((row * 10) + 5);
    return { x, y };
}

function drawSVGLines() {
    const svg = document.getElementById('svg-layer');
    let svgHtml = '';

    for (let start in ladders) {
        let p1 = getSVGCoords(parseInt(start));
        let p2 = getSVGCoords(ladders[start]);
        let dx = p2.x - p1.x; let dy = p2.y - p1.y;
        let len = Math.sqrt(dx*dx + dy*dy);
        let nx = -dy/len; let ny = dx/len;
        let w = 0.8; 
        
        svgHtml += `<line x1="${p1.x + nx*w}" y1="${p1.y + ny*w}" x2="${p2.x + nx*w}" y2="${p2.y + ny*w}" class="ladder-shadow"/>`;
        svgHtml += `<line x1="${p1.x - nx*w}" y1="${p1.y - ny*w}" x2="${p2.x - nx*w}" y2="${p2.y - ny*w}" class="ladder-shadow"/>`;
        svgHtml += `<line x1="${p1.x + nx*w}" y1="${p1.y + ny*w}" x2="${p2.x + nx*w}" y2="${p2.y + ny*w}" class="ladder-rail"/>`;
        svgHtml += `<line x1="${p1.x - nx*w}" y1="${p1.y - ny*w}" x2="${p2.x - nx*w}" y2="${p2.y - ny*w}" class="ladder-rail"/>`;
        
        let rungsCount = Math.floor(len / 3); 
        for(let i=1; i<=rungsCount; i++) {
            let frac = i / (rungsCount + 1);
            let rx = p1.x + dx*frac; let ry = p1.y + dy*frac;
            svgHtml += `<line x1="${rx + nx*w}" y1="${ry + ny*w}" x2="${rx - nx*w}" y2="${ry - ny*w}" class="ladder-rung"/>`;
        }
    }

    for (let start in snakes) {
        let p1 = getSVGCoords(parseInt(start)); 
        let p2 = getSVGCoords(snakes[start]);   
        let dx = p2.x - p1.x; let dy = p2.y - p1.y;
        let len = Math.sqrt(dx*dx + dy*dy);
        let nx = -dy/len; let ny = dx/len; 
        
        let curveAmp = 8 + (Math.random()*4);
        if(Math.random() > 0.5) curveAmp *= -1; 
        let cx1 = p1.x + dx*0.3 + nx*curveAmp;
        let cy1 = p1.y + dy*0.3 + ny*curveAmp;
        let cx2 = p1.x + dx*0.7 - nx*curveAmp;
        let cy2 = p1.y + dy*0.7 - ny*curveAmp;
        
        let dPath = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;
        svgHtml += `<path d="${dPath}" class="snake-body" />`;
        svgHtml += `<path d="${dPath}" class="snake-pattern" />`;
        svgHtml += `<circle cx="${p1.x}" cy="${p1.y}" r="1.4" class="snake-head-bg"/>`;
        svgHtml += `<circle cx="${p1.x + nx*0.7 - dx/len*0.4}" cy="${p1.y + ny*0.7 - dy/len*0.4}" r="0.3" fill="#fff" />`;
        svgHtml += `<circle cx="${p1.x + nx*0.7 - dx/len*0.4}" cy="${p1.y + ny*0.7 - dy/len*0.4}" r="0.1" fill="#000" />`; 
        svgHtml += `<circle cx="${p1.x - nx*0.7 - dx/len*0.4}" cy="${p1.y - ny*0.7 - dy/len*0.4}" r="0.3" fill="#fff" />`;
        svgHtml += `<circle cx="${p1.x - nx*0.7 - dx/len*0.4}" cy="${p1.y - ny*0.7 - dy/len*0.4}" r="0.1" fill="#000" />`;
    }
    svg.innerHTML = svgHtml;
}

function createPawns() {
    const container = document.getElementById('pawns-layer');
    container.innerHTML = '';
    players.forEach(p => {
        let pawn = document.createElement('div');
        pawn.className = 'pawn';
        pawn.id = `pawn-${p.id}`;
        pawn.style.backgroundColor = p.color;
        container.appendChild(pawn);
    });
    updateAllPawnsVisuals();
}

function updateAllPawnsVisuals() {
    let occupiedPositions = {};
    players.forEach(p => {
        if (!occupiedPositions[p.pos]) occupiedPositions[p.pos] = [];
        occupiedPositions[p.pos].push(p);
    });

    players.forEach(p => {
        const pawn = document.getElementById(`pawn-${p.id}`);
        const coords = getSVGCoords(p.pos);
        
        let offX = 0; let offY = 0;

        if (p.pos === 0) {
            offX = offsets[p.id].x * 2.5; 
            offY = offsets[p.id].y * 1.5;
        } else if (occupiedPositions[p.pos].length > 1) {
            offX = offsets[p.id].x;
            offY = offsets[p.id].y;
        } 

        pawn.style.left = `calc(${coords.x}% + ${offX}%)`;
        pawn.style.top = `calc(${coords.y}% + ${offY}%)`;
    });
}

// --- 4. ENGINE DADU & CHEAT LOGIC ---
function getDiceRoll(player) {
    if (player.isCheater) {
        let pos = player.pos;

        // BUFF 1: Base Exit 
        if (pos === 0) {
            return Math.random() < 0.65 ? 1 : Math.floor(Math.random() * 5) + 2; 
        }

        // BUFF 5: Auto Finish 
        let distanceToWin = 100 - pos;
        if (distanceToWin <= 6) {
            if (Math.random() < 0.30) return distanceToWin; 
        }

        // BUFF 3: Magnet Tangga
        let ladderDist = -1;
        for (let i = 1; i <= 6; i++) {
            if (ladders[pos + i]) { ladderDist = i; break; }
        }
        if (ladderDist !== -1 && Math.random() < 0.35) return ladderDist;

        // BUFF 2: Dadu Dewa
        let rng = Math.random();
        if (rng < 0.35) return 6;
        if (rng < 0.55) return 5;
        return Math.floor(Math.random() * 4) + 1;
    }
    
    return Math.floor(Math.random() * 6) + 1;
}

function getDiceHTML(num) {
    if (num === 1) return '<div class="dot dot-c"></div>';
    if (num === 2) return '<div class="dot dot-tr"></div><div class="dot dot-bl"></div>';
    if (num === 3) return '<div class="dot dot-tr"></div><div class="dot dot-c"></div><div class="dot dot-bl"></div>';
    if (num === 4) return '<div class="dot dot-tl"></div><div class="dot dot-tr"></div><div class="dot dot-bl"></div><div class="dot dot-br"></div>';
    if (num === 5) return '<div class="dot dot-tl"></div><div class="dot dot-tr"></div><div class="dot dot-c"></div><div class="dot dot-bl"></div><div class="dot dot-br"></div>';
    if (num === 6) return '<div class="dot dot-tl"></div><div class="dot dot-tr"></div><div class="dot dot-ml"></div><div class="dot dot-mr"></div><div class="dot dot-bl"></div><div class="dot dot-br"></div>';
    return '<div class="dot dot-c"></div>';
}

// --- 5. GAMEPLAY LOOP & AUDIO ---
function playTurn(clickedId) {
    if (!gameActive || isRolling || clickedId !== currentTurn) return;
    
    isRolling = true;
    const player = players[currentTurn];
    const diceDisplay = document.getElementById(`dice-${player.id}`);
    
    document.querySelectorAll('.pawn').forEach(p => p.classList.remove('active'));
    document.getElementById(`pawn-${player.id}`).classList.add('active');
    
    const finalDice = getDiceRoll(player);
    
    // SFX KOCOK
    sfxDice.currentTime = 0;
    sfxDice.play().catch(e => console.log(e));

    diceDisplay.classList.add('rolling');
    
    // Animasi Acak Wajah Dadu
    let shuffleInterval = setInterval(() => {
        let randomFace = Math.floor(Math.random() * 6) + 1;
        diceDisplay.innerHTML = getDiceHTML(randomFace);
    }, 50);
    
    setTimeout(() => {
        clearInterval(shuffleInterval); 
        diceDisplay.classList.remove('rolling');
        diceDisplay.innerHTML = getDiceHTML(finalDice); 
        
        executeMovement(player, finalDice);
    }, 500); 
}

function executeMovement(player, dice) {
    let pName = `<span class="log-name" style="color:${player.color}">${player.name}</span>`;
    let logMsgText = `${pName} melempar <b>${dice}</b>. `;
    let delayToNextTurn = 500; 

    if (player.pos === 0) {
        if (dice === 1) {
            player.pos = 1;
            logMsgText += "Mulai masuk ke papan!";
            updateAllPawnsVisuals(); 
        } else {
            logMsgText += "Masih tertahan di Base.";
        }
        finishMovement(logMsgText, delayToNextTurn, "log-normal");
        return;
    }

    let newPos = player.pos + dice;
    
    if (newPos > 100) {
        let bounce = newPos - 100;
        newPos = 100 - bounce;
        logMsgText += `Mundur ke ${newPos}. `;
    } else {
        logMsgText += `Mendarat di ${newPos}. `;
    }

    player.pos = newPos;
    updateAllPawnsVisuals(); 

    setTimeout(() => {
        let eventTriggered = false;
        let eventType = "log-normal";

        if (ladders[player.pos]) {
            player.pos = ladders[player.pos];
            logMsgText += `<span class="log-ladder">Naik tangga ke ${player.pos}! 🪜</span>`;
            eventTriggered = true;
            eventType = "log-ladder";
            
            sfxLadder.currentTime = 0;
            sfxLadder.play().catch(e => console.log(e));
        }
        else if (snakes[player.pos]) {
            if (player.isCheater) {
                logMsgText += `<span class="log-god">Ular tunduk pada ${player.name}! 😎</span>`;
                eventType = "log-god";
                
                sfxSnakeImmune.currentTime = 0;
                sfxSnakeImmune.play().catch(e => console.log(e));
            } else {
                player.pos = snakes[player.pos];
                logMsgText += `<span class="log-snake">Turun ke ${player.pos} 🐍</span>`;
                eventTriggered = true;
                eventType = "log-snake";
                
                sfxSnakeDrop.currentTime = 0;
                sfxSnakeDrop.play().catch(e => console.log(e));
            }
        }

        if (eventTriggered) {
            updateAllPawnsVisuals(); 
            delayToNextTurn = 600; 
        } else {
            delayToNextTurn = 100; 
        }

        finishMovement(logMsgText, delayToNextTurn, eventType);

    }, 500); 
}

function finishMovement(logMsgText, delay, typeClass) {
    setTimeout(() => {
        logMsg(logMsgText, typeClass);
        const player = players[currentTurn];

        if (player.pos === 100) {
            gameActive = false;
            
            sfxWin.currentTime = 0;
            sfxWin.play().catch(e => console.log(e));

            document.getElementById('winner-text').innerHTML = `<strong style="color:${player.color}; font-size:1.8rem;">${player.name}</strong><br>Telah Memenangkan Permainan!`;
            document.getElementById('winner-modal').style.display = 'flex';
            isRolling = false;
            return;
        }

        currentTurn = (currentTurn + 1) % players.length;
        updateTurnUI();
        isRolling = false;
    }, delay);
}

// --- 6. UTILITY UI ---
function updateTurnUI() {
    document.querySelectorAll('.player-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    if(players[currentTurn]) {
        document.getElementById(`panel-${currentTurn}`).classList.add('active');
    }
}

function logMsg(msg, cssClass = "log-normal") {
    const logBox = document.getElementById('game-log');
    logBox.innerHTML += `<div class="log-entry ${cssClass}">${msg}</div>`;
    logBox.scrollTop = logBox.scrollHeight;
}

// --- TAMBAHAN: FUNGSI DOWNLOAD GAME ---
function downloadGame(e) {
    e.preventDefault();
    alert("Fitur unduhan sedang disiapkan! Lu bisa bookmark atau install web ini via PWA / Add to Home Screen browser.");
}