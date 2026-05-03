import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, deleteDoc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Auth guard ──────────────────────────────────────────────────────────────
if (sessionStorage.getItem('pkl_auth') !== '1') {
  window.location.replace('index.html');
}

const isAdmin = () => sessionStorage.getItem('pkl_admin') === '1';

document.getElementById('adminBadge').hidden = !isAdmin();
document.getElementById('playerBadge').hidden = isAdmin();
document.getElementById('seasonResetBtn').hidden = !isAdmin();

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('pkl_auth');
  sessionStorage.removeItem('pkl_admin');
  window.location.replace('index.html');
});

// ─── Tab navigation ──────────────────────────────────────────────────────────
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

// ─── Firestore unsub registry ────────────────────────────────────────────────
const unsubs = [];
function unsubAll() { unsubs.forEach(fn => fn()); unsubs.length = 0; }

// ─── In-memory caches ────────────────────────────────────────────────────────
let players  = [];
let sessions = [];
let games    = [];

// ─── Flags ───────────────────────────────────────────────────────────────────
const getFlag = (code) => `<span class="fi fi-${code}"></span>`;
const COUNTRY_NAMES = {
  nz: 'New Zealand', ar: 'Argentina', br: 'Brazil', cl: 'Chile', co: 'Colombia', mx: 'Mexico', pe: 'Peru', uy: 'Uruguay',
  au: 'Australia', cn: 'China', jp: 'Japan', gb: 'United Kingdom', de: 'Germany', es: 'Spain', fr: 'France', it: 'Italy',
  nl: 'Netherlands', pt: 'Portugal', us: 'United States'
};

// ─── Init listeners ──────────────────────────────────────────────────────────
function initListeners() {
  unsubs.push(
    onSnapshot(query(collection(db, 'players'), orderBy('createdAt')), snap => {
      players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderPlayers();
      renderPlaySelect();
      renderStats();
    }),
    onSnapshot(query(collection(db, 'sessions'), orderBy('date', 'desc')), snap => {
      sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSessions();
      renderSessionSelect();
      renderPastGames();
    }),
    onSnapshot(query(collection(db, 'games'), orderBy('createdAt', 'desc')), snap => {
      games = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderRecentGames();
      renderPastGames();
      renderStats();
    })
  );
}

// ─── PLAYERS TAB ─────────────────────────────────────────────────────────────
const playerList    = document.getElementById('playerList');
const addPlayerForm = document.getElementById('addPlayerForm');
const playerNameIn  = document.getElementById('playerName');
const playerCountry = document.getElementById('playerCountry');

addPlayerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name    = playerNameIn.value.trim();
  const country = playerCountry.value;
  if (!name || players.length >= 16) return;
  await addDoc(collection(db, 'players'), { name, country, createdAt: serverTimestamp() });
  addPlayerForm.reset();
  playerCountry.value = 'nz';
});

function renderPlayers() {
  renderHome();
  renderPlayerSelectMenu();
  if (!players.length) {
    playerList.innerHTML = '<p class="empty-msg">No players yet.</p>';
    return;
  }
  playerList.innerHTML = players.map(p => `
    <div class="player-card">
      <span class="flag">${getFlag(p.country)}</span>
      <span class="player-name">${esc(p.name)}</span>
      <span class="country-label">${COUNTRY_NAMES[p.country] ?? p.country}</span>
      ${isAdmin() ? `<button class="icon-btn del-player" data-id="${p.id}" title="Remove player"><i class="bi bi-trash3"></i></button>` : ''}
    </div>
  `).join('');

  if (isAdmin()) {
    playerList.querySelectorAll('.del-player').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Remove this player?')) {
          await deleteDoc(doc(db, 'players', btn.dataset.id));
        }
      });
    });
  }
}

// ─── SESSIONS TAB ────────────────────────────────────────────────────────────
const sessionList    = document.getElementById('sessionList');
const addSessionForm = document.getElementById('addSessionForm');

let sessionPlayerSelect = {};

addSessionForm.addEventListener('submit', async e => {
  e.preventDefault();
  const date      = document.getElementById('sessionDate').value;
  const startTime = document.getElementById('sessionStartTime').value;
  const endTime   = document.getElementById('sessionEndTime').value;
  const address   = document.getElementById('sessionAddress').value.trim();
  const assignedPlayers = Object.entries(sessionPlayerSelect).filter(([, checked]) => checked).map(([id]) => id);

  if (!date || !startTime || !endTime) return;

  await addDoc(collection(db, 'sessions'), {
    date, startTime, endTime, address, assignedPlayers, createdAt: serverTimestamp()
  });

  addSessionForm.reset();
  sessionPlayerSelect = {};
  document.getElementById('sessionDate').value = today();
  renderPlayerSelectMenu();
});

function mapsUrl(address) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

function calendarUrl(session, type) {
  const [y, m, d] = session.date.split('-');
  const dateStr = `${y}${m}${d}`;
  const title = `Pickleball${session.address ? ' @ ' + session.address : ''}`;

  let startTime = '090000';
  let endTime = '110000';
  if (session.startTime) {
    const [h, min] = session.startTime.split(':');
    startTime = `${h}${min}00`;
  }
  if (session.endTime) {
    const [h, min] = session.endTime.split(':');
    endTime = `${h}${min}00`;
  }

  if (type === 'google') {
    const startDateTime = `${dateStr}T${startTime}`;
    const endDateTime = `${dateStr}T${endTime}`;
    return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(session.address || '')}`;
  }
  return '#';
}

function renderSessions() {
  renderHome();
  if (!sessions.length) {
    sessionList.innerHTML = '<p class="empty-msg">No sessions yet.</p>';
    return;
  }
  sessionList.innerHTML = sessions.map(s => {
    const playerNames = (s.assignedPlayers || []).map(pid => playerName(pid)).join(', ');
    return `
      <div class="session-card">
        <div class="session-header">
          <span class="session-date"><i class="bi bi-calendar3"></i> ${formatDate(s.date)}</span>
          ${s.startTime && s.endTime ? `<span class="session-time"><i class="bi bi-clock"></i> ${formatTime(s.startTime)} - ${formatTime(s.endTime)}</span>` : ''}
          ${isAdmin() ? `<button class="icon-btn del-session" data-id="${s.id}" title="Delete session"><i class="bi bi-trash3"></i></button>` : ''}
        </div>
        ${s.address ? `
          <p class="session-addr">
            <i class="bi bi-geo-alt"></i> ${esc(s.address)}
            <a href="${mapsUrl(s.address)}" target="_blank" class="maps-link"><i class="bi bi-map"></i> Maps</a>
          </p>` : ''}
        ${playerNames ? `<p class="session-players"><i class="bi bi-people-fill"></i> ${playerNames}</p>` : ''}
        ${s.date ? `
          <div class="cal-links">
            <a href="${calendarUrl(s, 'google')}" target="_blank" class="cal-btn"><i class="bi bi-calendar-check"></i> Google</a>
            <a href="#" class="cal-btn apple-cal" data-date="${s.date}" data-time="${s.startTime || ''}" data-addr="${s.address || ''}"><i class="bi bi-calendar-check"></i> Apple</a>
          </div>` : ''}
      </div>
    `;
  }).join('');

  // Apple Calendar (generate iCal file)
  sessionList.querySelectorAll('.apple-cal').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const date = link.dataset.date;
      const addr = link.dataset.addr;
      const time = link.dataset.time;
      const [y, m, d] = date.split('-');

      let startTime = '090000';
      let endTime = '110000';
      if (time) {
        const [h, min] = time.split(':');
        const endH = (parseInt(h, 10) + 2) % 24;
        startTime = `${h}${min}00`;
        endTime = `${String(endH).padStart(2, '0')}${min}00`;
      }

      const ical = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Pickle Champs//EN\nBEGIN:VEVENT\nDTSTART:${y}${m}${d}T${startTime}\nDTEND:${y}${m}${d}T${endTime}\nSUMMARY:Pickleball${addr ? ' @ ' + addr : ''}\nDESCRIPTION:${addr || ''}\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([ical], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pickle-champs-${date}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  if (isAdmin()) {
    sessionList.querySelectorAll('.del-session').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this session?')) {
          await deleteDoc(doc(db, 'sessions', btn.dataset.id));
        }
      });
    });
  }
}

// ─── PLAY TAB ────────────────────────────────────────────────────────────────
const sessionSelect = document.getElementById('sessionSelect');
const playersGrid   = document.getElementById('playersGrid');
const score1In      = document.getElementById('score1');
const score2In      = document.getElementById('score2');
const recordGameBtn = document.getElementById('recordGameBtn');
const recentGames   = document.getElementById('recentGames');

let teamAssign = {};

function renderSessionSelect() {
  const prev = sessionSelect.value;
  sessionSelect.innerHTML = '<option value="">— Select session —</option>' +
    sessions.map(s => `<option value="${s.id}">${formatDate(s.date)}${s.address ? ' · ' + s.address : ''}</option>`).join('');
  if (prev) sessionSelect.value = prev;
}

function renderTodaySessionCard() {
  const card = document.getElementById('todaySessionCard');
  const todaySession = getTodaySession();
  if (!todaySession) {
    card.innerHTML = '<h3>No session scheduled for today</h3>';
    return;
  }
  card.innerHTML = `
    <h3>${formatDate(todaySession.date)}</h3>
    <p style="margin:.5rem 0;color:var(--muted);">${formatTime(todaySession.startTime)} – ${formatTime(todaySession.endTime)}</p>
    ${todaySession.address ? `<p style="margin:.5rem 0;color:var(--muted);">${todaySession.address}</p>` : ''}
  `;
}

function renderPlayerSelectMenu() {
  const menu = document.getElementById('playerSelectMenu');
  if (!players.length) {
    menu.innerHTML = '<p style="padding:.5rem;color:var(--muted);">No players yet. Add players first.</p>';
    return;
  }
  menu.innerHTML = players.map(p => `
    <label class="player-select-item">
      <input type="checkbox" data-id="${p.id}" ${sessionPlayerSelect[p.id] ? 'checked' : ''} />
      <span>${esc(p.name)}</span>
    </label>
  `).join('');

  menu.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      sessionPlayerSelect[checkbox.dataset.id] = checkbox.checked;
      updatePlayerSelectToggle();
    });
  });
}

function updatePlayerSelectToggle() {
  const toggle = document.querySelector('.dropdown-toggle');
  const selected = Object.values(sessionPlayerSelect).filter(v => v).length;
  toggle.textContent = selected > 0 ? `${selected} Player${selected !== 1 ? 's' : ''} Selected` : 'Select Players';
}

function renderPlaySelect() {
  teamAssign = {};
  players.forEach(p => { teamAssign[p.id] = 0; });
  renderTeamGrid();
}

function renderTeamGrid() {
  const selectedSessionId = sessionSelect.value;
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const assignedPlayerIds = selectedSession?.assignedPlayers || [];
  const playersToShow = assignedPlayerIds.length > 0
    ? players.filter(p => assignedPlayerIds.includes(p.id))
    : players;

  if (!playersToShow.length) {
    playersGrid.innerHTML = '<p class="empty-msg">' +
      (selectedSessionId ? 'No players assigned to this session.' : 'Select a session first.') +
      '</p>';
    recordGameBtn.disabled = true;
    return;
  }
  playersGrid.innerHTML = playersToShow.map(p => {
    const t = teamAssign[p.id] ?? 0;
    const cls   = t === 1 ? 'team1' : t === 2 ? 'team2' : '';
    const label = t === 1 ? 'Team 1' : t === 2 ? 'Team 2' : 'Tap to assign';
    return `
      <div class="player-tile ${cls}" data-id="${p.id}">
        <span class="tile-flag">${getFlag(p.country)}</span>
        <span class="tile-name">${esc(p.name)}</span>
        <span class="tile-team">${label}</span>
      </div>`;
  }).join('');

  playersGrid.querySelectorAll('.player-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      teamAssign[tile.dataset.id] = ((teamAssign[tile.dataset.id] ?? 0) + 1) % 3;
      renderTeamGrid();
    });
  });

  const t1 = Object.values(teamAssign).filter(v => v === 1).length;
  const t2 = Object.values(teamAssign).filter(v => v === 2).length;
  recordGameBtn.disabled = !(t1 === 2 && t2 === 2);
}

recordGameBtn.addEventListener('click', async () => {
  const sessionId = sessionSelect.value;
  const s1 = parseInt(score1In.value, 10);
  const s2 = parseInt(score2In.value, 10);
  if (!sessionId)                             { alert('Please select a session.'); return; }
  if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) { alert('Enter valid scores.'); return; }

  const team1 = Object.entries(teamAssign).filter(([,v]) => v === 1).map(([k]) => k);
  const team2 = Object.entries(teamAssign).filter(([,v]) => v === 2).map(([k]) => k);

  await addDoc(collection(db, 'games'), {
    sessionId, team1, team2, score1: s1, score2: s2, archived: false, createdAt: serverTimestamp()
  });

  score1In.value = '';
  score2In.value = '';
  renderPlaySelect();
  alert('Game recorded!');
});

sessionSelect.addEventListener('change', () => {
  renderRecentGames();
  renderTeamGrid();
});

const groupSessionBtn = document.getElementById('groupSessionBtn');
groupSessionBtn.addEventListener('click', async () => {
  if (!isAdmin()) return;
  const sessionId = sessionSelect.value;
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;
  if (!confirm('Group this session and move games to past games?')) return;
  await updateDoc(doc(db, 'sessions', session.id), { grouped: true });
  sessionSelect.value = '';
  renderRecentGames();
});

const detailBackBtn = document.getElementById('detailBackBtn');
detailBackBtn.addEventListener('click', () => {
  document.getElementById('sessionDetailOverlay').hidden = true;
});

function renderRecentGames() {
  renderHome();
  const selectedSessionId = sessionSelect.value;
  const selectedGames = games
    .filter(g => !g.archived && g.sessionId === selectedSessionId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const groupBtn = document.getElementById('groupSessionBtn');
  if (isAdmin() && selectedSessionId && selectedGames.length > 0) {
    groupBtn.hidden = false;
  } else {
    groupBtn.hidden = true;
  }

  if (!selectedSessionId) {
    recentGames.innerHTML = '<p class="empty-msg">Select a session to view games.</p>';
    return;
  }

  if (!selectedGames.length) {
    recentGames.innerHTML = '<p class="empty-msg">No games yet for this session.</p>';
    return;
  }

  recentGames.innerHTML = selectedGames.map((g, idx) => {
    const t1names = (g.team1 || []).map(id => playerName(id)).join(' & ');
    const t2names = (g.team2 || []).map(id => playerName(id)).join(' & ');
    const winner  = g.score1 > g.score2 ? 'team1' : g.score2 > g.score1 ? 'team2' : 'draw';
    const gameNum = idx + 1;
    return `
      <div class="game-card">
        <div class="game-number">Game ${gameNum}</div>
        <div class="game-teams">
          <span class="team-a ${winner === 'team1' ? 'winner' : ''}">${t1names}</span>
          <span class="score">${g.score1} – ${g.score2}</span>
          <span class="team-b ${winner === 'team2' ? 'winner' : ''}">${t2names}</span>
        </div>
        ${isAdmin() ? `<div class="game-actions"><button class="del-game-btn" data-id="${g.id}"><i class="bi bi-trash3"></i> Delete</button></div>` : ''}
      </div>`;
  }).join('');

  if (isAdmin()) {
    recentGames.querySelectorAll('.del-game-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this game?')) {
          await deleteDoc(doc(db, 'games', btn.dataset.id));
        }
      });
    });
  }
}

function renderPastGames() {
  const pastGamesDiv = document.getElementById('pastGames');
  const groupedSessions = sessions.filter(s => s.grouped === true).sort((a, b) => new Date(b.date) - new Date(a.date));
  const orphanedGames = games.filter(g => !g.archived && (!g.sessionId || !sessions.find(s => s.id === g.sessionId)));

  if (!groupedSessions.length && !orphanedGames.length) {
    pastGamesDiv.innerHTML = '<p class="empty-msg">No past games yet.</p>';
    return;
  }

  let html = '';

  // Orphaned games section
  if (orphanedGames.length > 0) {
    html += `
      <div class="past-session-row" style="background:var(--surface2);border-color:var(--muted);justify-content:space-between;">
        <div style="flex:1;">
          <span class="session-date" style="color:var(--muted);">Unassigned Games</span>
          <span class="session-count">${orphanedGames.length} game${orphanedGames.length !== 1 ? 's' : ''}</span>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <button class="btn-delete-orphaned" style="background:var(--danger);color:white;border:none;padding:.4rem .6rem;border-radius:4px;cursor:pointer;font-size:.75rem;"><i class="bi bi-trash3"></i> Delete All</button>
          <i class="bi bi-chevron-right" style="opacity:.5;"></i>
        </div>
      </div>
    `;
  }

  // Grouped sessions
  html += groupedSessions.map(session => {
    const sessionGames = games.filter(g => g.sessionId === session.id && !g.archived);
    return `
      <div class="past-session-row" data-session-id="${session.id}">
        <span class="session-date">${formatDate(session.date)}</span>
        <span class="session-count">${sessionGames.length} game${sessionGames.length !== 1 ? 's' : ''}</span>
        <i class="bi bi-chevron-right"></i>
      </div>
    `;
  }).join('');

  pastGamesDiv.innerHTML = html;

  // Orphaned games handlers
  if (orphanedGames.length > 0) {
    const orphanedRow = pastGamesDiv.querySelector('.past-session-row');
    orphanedRow.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-orphaned')) return;
      openOrphanedGamesDetail(orphanedGames);
    });

    const deleteBtn = orphanedRow.querySelector('.btn-delete-orphaned');
    if (deleteBtn && isAdmin()) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`Delete all ${orphanedGames.length} unassigned games?`)) return;
        const batch = writeBatch(db);
        orphanedGames.forEach(g => {
          batch.deleteDoc(doc(db, 'games', g.id));
        });
        await batch.commit();
      });
    }
  }

  // Grouped sessions click handlers
  pastGamesDiv.querySelectorAll('.past-session-row[data-session-id]').forEach(row => {
    row.addEventListener('click', () => {
      openSessionDetail(row.dataset.sessionId);
    });
  });
}

function openSessionDetail(sessionId) {
  const session = sessions.find(s => s.id === sessionId);
  const sessionGames = games.filter(g => g.sessionId === sessionId && !g.archived).sort((a, b) => a.createdAt - b.createdAt);
  const overlay = document.getElementById('sessionDetailOverlay');
  const dateTitle = document.getElementById('detailDateTitle');
  const detailGamesContainer = document.getElementById('detailGamesContainer');

  if (!session) return;

  dateTitle.textContent = formatDate(session.date);
  detailGamesContainer.innerHTML = sessionGames.map((g, idx) => {
    const t1names = (g.team1 || []).map(id => playerName(id)).join(' & ');
    const t2names = (g.team2 || []).map(id => playerName(id)).join(' & ');
    const winner  = g.score1 > g.score2 ? 'team1' : g.score2 > g.score1 ? 'team2' : 'draw';
    const gameNum = idx + 1;
    return `
      <div class="game-card">
        <div class="game-number">Game ${gameNum}</div>
        <div class="game-teams">
          <span class="team-a ${winner === 'team1' ? 'winner' : ''}">${t1names}</span>
          <span class="score">${g.score1} – ${g.score2}</span>
          <span class="team-b ${winner === 'team2' ? 'winner' : ''}">${t2names}</span>
        </div>
      </div>
    `;
  }).join('');

  overlay.hidden = false;
}

function openOrphanedGamesDetail(orphanedGames) {
  const overlay = document.getElementById('sessionDetailOverlay');
  const dateTitle = document.getElementById('detailDateTitle');
  const detailGamesContainer = document.getElementById('detailGamesContainer');

  dateTitle.textContent = 'Unassigned Games';
  detailGamesContainer.innerHTML = orphanedGames.sort((a, b) => a.createdAt - b.createdAt).map((g, idx) => {
    const t1names = (g.team1 || []).map(id => playerName(id)).join(' & ');
    const t2names = (g.team2 || []).map(id => playerName(id)).join(' & ');
    const winner  = g.score1 > g.score2 ? 'team1' : g.score2 > g.score1 ? 'team2' : 'draw';
    const gameNum = idx + 1;
    return `
      <div class="game-card">
        <div class="game-number">Game ${gameNum}</div>
        <div class="game-teams">
          <span class="team-a ${winner === 'team1' ? 'winner' : ''}">${t1names}</span>
          <span class="score">${g.score1} – ${g.score2}</span>
          <span class="team-b ${winner === 'team2' ? 'winner' : ''}">${t2names}</span>
        </div>
      </div>
    `;
  }).join('');

  overlay.hidden = false;
}

// ─── STATS TAB ───────────────────────────────────────────────────────────────
const statsContainer  = document.getElementById('statsContainer');
const chartContainer  = document.getElementById('chartContainer');
const seasonResetBtn  = document.getElementById('seasonResetBtn');

function calculateStreaks(playerId) {
  const playerGames = games.filter(g => !g.archived && ([...(g.team1 || []), ...(g.team2 || [])].includes(playerId)));
  let currentWin = 0, currentLoss = 0, maxWin = 0, maxLoss = 0;

  for (let g of playerGames) {
    const inTeam1 = g.team1 && g.team1.includes(playerId);
    const won = (inTeam1 && g.score1 > g.score2) || (!inTeam1 && g.score2 > g.score1);

    if (won) {
      currentWin++;
      maxWin = Math.max(maxWin, currentWin);
      currentLoss = 0;
    } else {
      currentLoss++;
      maxLoss = Math.max(maxLoss, currentLoss);
      currentWin = 0;
    }
  }
  return { current: currentWin > 0 ? currentWin : -currentLoss, max: maxWin };
}

function renderStats() {
  if (!players.length) {
    statsContainer.innerHTML = '<p class="empty-msg">No data yet.</p>';
    chartContainer.innerHTML = '';
    return;
  }

  const activeGames = games.filter(g => !g.archived);
  const stats = {};
  players.forEach(p => {
    stats[p.id] = { name: p.name, country: p.country, played: 0, wins: 0, losses: 0, draws: 0, pf: 0, pa: 0 };
  });

  activeGames.forEach(g => {
    [...(g.team1 || []), ...(g.team2 || [])].forEach(id => { if (stats[id]) stats[id].played++; });
    const winner = g.score1 > g.score2 ? 'team1' : g.score2 > g.score1 ? 'team2' : 'draw';
    (g.team1 || []).forEach(id => {
      if (!stats[id]) return;
      stats[id].pf += g.score1; stats[id].pa += g.score2;
      if (winner === 'team1') stats[id].wins++;
      else if (winner === 'team2') stats[id].losses++;
      else stats[id].draws++;
    });
    (g.team2 || []).forEach(id => {
      if (!stats[id]) return;
      stats[id].pf += g.score2; stats[id].pa += g.score1;
      if (winner === 'team2') stats[id].wins++;
      else if (winner === 'team1') stats[id].losses++;
      else stats[id].draws++;
    });
  });

  const sorted = Object.entries(stats).map(([id, s]) => ({ id, ...s, streak: calculateStreaks(id) }))
    .sort((a, b) => {
      const wr = s => s.played ? s.wins / s.played : 0;
      return wr(b) - wr(a) || b.wins - a.wins;
    });

  // Chart
  if (sorted.some(s => s.played > 0)) {
    const chartData = sorted.filter(s => s.played > 0);
    const ctx = document.createElement('canvas');
    chartContainer.innerHTML = '';
    chartContainer.appendChild(ctx);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.map(s => s.name),
        datasets: [
          { label: 'Wins', data: chartData.map(s => s.wins), backgroundColor: '#4ade80' },
          { label: 'Losses', data: chartData.map(s => s.losses), backgroundColor: '#ef4444' },
          { label: 'Draws', data: chartData.map(s => s.draws), backgroundColor: '#94a3b8' }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'top' } },
        scales: { x: { stacked: true }, y: { stacked: true } }
      }
    });
  } else {
    chartContainer.innerHTML = '';
  }

  // Table
  statsContainer.innerHTML = `
    <table class="stats-table">
      <thead><tr>
        <th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>D</th><th>W%</th><th>+/-</th><th>Streak</th>
      </tr></thead>
      <tbody>
        ${sorted.map((s, i) => {
          const wr = s.played ? Math.round(s.wins / s.played * 100) : 0;
          const diff = s.pf - s.pa;
          const streakText = s.streak.current > 0 ? `+${s.streak.current}W` : s.streak.current < 0 ? `${s.streak.current}L` : '—';
          return `<tr class="${i === 0 && s.played > 0 ? 'top-row' : ''}">
            <td>${i === 0 && s.played > 0 ? '🏆' : i + 1}</td>
            <td><span class="flag">${getFlag(s.country)}</span> ${esc(s.name)}</td>
            <td>${s.played}</td>
            <td>${s.wins}</td>
            <td>${s.losses}</td>
            <td>${s.draws}</td>
            <td>${wr}%</td>
            <td class="${diff >= 0 ? 'pos' : 'neg'}">${diff >= 0 ? '+' : ''}${diff}</td>
            <td class="streak-cell">${streakText}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div class="stats-legend">
      <span><strong>P</strong> Played</span>
      <span><strong>W</strong> Wins</span>
      <span><strong>L</strong> Losses</span>
      <span><strong>D</strong> Draws</span>
      <span><strong>W%</strong> Win rate</span>
      <span><strong>+/-</strong> Point diff</span>
    </div>`;
}

seasonResetBtn.addEventListener('click', async () => {
  if (!isAdmin()) return;
  if (!confirm('Archive all games and start a new season? This cannot be undone.')) return;

  const batch = writeBatch(db);
  games.filter(g => !g.archived).forEach(g => {
    batch.update(doc(db, 'games', g.id), { archived: true });
  });
  await batch.commit();
});

// ─── HOME TAB ────────────────────────────────────────────────────────────────
function renderHome() {
  const nextSessions = sessions.filter(s => s.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  const next   = nextSessions[0];
  const nextEl = document.getElementById('nextSession');
  if (next) {
    nextEl.innerHTML = `
      <div class="next-session-card">
        <i class="bi bi-calendar-event"></i>
        <div>
          <strong>${formatDate(next.date)}</strong>
          ${next.time    ? `<br><i class="bi bi-clock"></i> ${next.time}` : ''}
          ${next.address ? `<br><i class="bi bi-geo-alt"></i> ${esc(next.address)}
            <a href="${mapsUrl(next.address)}" target="_blank" class="maps-link"><i class="bi bi-map"></i> Maps</a>` : ''}
        </div>
      </div>`;
  } else {
    nextEl.innerHTML = '<p class="empty-msg">No upcoming sessions.</p>';
  }

  const activeGames = games.filter(g => !g.archived);
  document.getElementById('homeStatGames').textContent    = activeGames.length;
  document.getElementById('homeStatPlayers').textContent  = players.length;
  document.getElementById('homeStatSessions').textContent = sessions.length;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function playerName(id) {
  const p = players.find(pl => pl.id === id);
  return p ? p.name : 'Unknown';
}

// ─── RULES TAB ────────────────────────────────────────────────────────────────
const rulesContainer = document.getElementById('rulesContainer');

const pickleBallRules = [
  { title: 'Scoring', content: 'Games are played to 11 points, win by 2. Only the serving team can score points. A team must win by a 2-point margin.' },
  { title: 'Serving', content: 'Serve underhand with the paddle below the wrist. The server keeps serving as long as their team wins rallies. When a serving team loses a rally, it becomes the other team\'s turn to serve.' },
  { title: 'Volley', content: 'A volley is hitting the ball in the air before it bounces. You cannot volley in the kitchen (no-volley zone) on either side of the net.' },
  { title: 'Kitchen (No-Volley Zone)', content: 'The kitchen is a 7-foot area on both sides of the net. Players cannot volley in the kitchen or stand in it while volleying.' },
  { title: 'Faults', content: 'A fault occurs when: the ball is hit above waist height during serve, the paddle is above the wrist, the serve lands outside the service box, or the server steps on the baseline.' },
  { title: 'Double Bounce Rule', content: 'The ball must bounce once on each side after the serve before volleys are allowed. This prevents players from dominating the net immediately after serve.' },
  { title: 'Net Touch', content: 'If the ball touches the net during a volley and lands in the opponent\'s court, it\'s a legal shot. However, if it touches the net and bounces back to your side, it\'s a fault.' },
  { title: 'In & Out', content: 'A ball is in if any part of it touches the line. A ball is out if it lands completely beyond the lines. The server must call nets and edges, other players can call balls on their side.' }
];

function renderRules() {
  rulesContainer.innerHTML = pickleBallRules.map((rule, i) => `
    <div class="rule-card">
      <h3><span class="rule-num">${i + 1}</span> ${rule.title}</h3>
      <p>${rule.content}</p>
    </div>
  `).join('');
}

// ─── Player Select Dropdown ──────────────────────────────────────────────────
const playerSelectDropdown = document.getElementById('playerSelectDropdown');
const dropdownToggle = playerSelectDropdown?.querySelector('.dropdown-toggle');
const dropdownMenu = playerSelectDropdown?.querySelector('.dropdown-menu');

if (dropdownToggle && dropdownMenu) {
  dropdownToggle.addEventListener('click', (e) => {
    e.preventDefault();
    dropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!playerSelectDropdown.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });
}

// ─── Address Search Button ───────────────────────────────────────────────────
document.getElementById('searchMapsBtn')?.addEventListener('click', e => {
  e.preventDefault();
  const address = document.getElementById('sessionAddress').value.trim();
  if (!address) { alert('Enter an address first'); return; }
  window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
});

// ─── Time Helper ──────────────────────────────────────────────────────────────
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function getTodaySession() {
  const todayDate = today();
  return sessions.find(s => s.date === todayDate && !s.grouped);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.getElementById('sessionDate').value = today();
renderRules();
initListeners();
