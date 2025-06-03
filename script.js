const DISCORD_USER_ID = '200207310625177602'; 
const LANYARD_WS_URL = 'wss://api.lanyard.rest/socket';

let socket = null;
let heartbeatInterval = null;
let spotifyUpdateInterval = null;
let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;

document.addEventListener('DOMContentLoaded', function() {
    initCustomCursor();
    createParticles();
    connectToLanyard();
});

function initCustomCursor() {
    const cursor = document.getElementById('cursor');
    const interactiveElements = document.querySelectorAll('a, button, .link-item, .avatar, .spotify-card, .discord-status');
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function animateCursor() {
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        
        cursorX += dx * 0.2;
        cursorY += dy * 0.2;
        
        cursor.style.left = cursorX - 8 + 'px';
        cursor.style.top = cursorY - 8 + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    document.addEventListener('mousedown', () => {
        cursor.classList.add('click');
    });
    
    document.addEventListener('mouseup', () => {
        cursor.classList.remove('click');
    });
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
        });
    });
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        createParticle(particlesContainer);
    }
    
    setInterval(() => {
        if (particlesContainer.children.length < particleCount) {
            createParticle(particlesContainer);
        }
    }, 200);
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
    particle.style.animationDelay = Math.random() * 2 + 's';
    
    container.appendChild(particle);
    
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 8000);
}

function connectToLanyard() {
    socket = new WebSocket(LANYARD_WS_URL);
    
    socket.onopen = function() {
        console.log('Connected to Lanyard');
    };
    
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleLanyardMessage(data);
    };
    
    socket.onclose = function() {
        console.log('Disconnected from Lanyard');
        setTimeout(connectToLanyard, 5000);
    };
    
    socket.onerror = function(error) {
        console.error('Lanyard WebSocket error:', error);
    };
}

function handleLanyardMessage(data) {
    switch (data.op) {
        case 1: 
            socket.send(JSON.stringify({
                op: 2,
                d: {
                    subscribe_to_id: DISCORD_USER_ID
                }
            }));
            
            heartbeatInterval = setInterval(() => {
                socket.send(JSON.stringify({ op: 3 }));
            }, data.d.heartbeat_interval);
            break;
            
        case 0:
            if (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE') {
                updateDiscordStatus(data.d);
            }
            break;
    }
}

function updateDiscordStatus(presence) {
    const avatar = document.getElementById('avatar');
    const username = document.getElementById('username');
    const status = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const discordActivity = document.getElementById('discord-activity');
    const activityIcon = document.getElementById('activity-icon');
    const activityName = document.getElementById('activity-name');
    const activityState = document.getElementById('activity-state');
    const spotifySection = document.getElementById('spotify-section');
    
    if (presence.discord_user) {
        const avatarUrl = presence.discord_user.avatar 
            ? `https://cdn.discordapp.com/avatars/${presence.discord_user.id}/${presence.discord_user.avatar}.png?size=256`
            : 'https://via.placeholder.com/120';
        avatar.src = avatarUrl;
        
        username.textContent = presence.discord_user.global_name || presence.discord_user.username;
    }
    
    status.className = 'status-indicator';
    statusText.className = 'status-text';
    let statusTextContent = 'Offline';
    
    if (presence.discord_status) {
        status.classList.add(presence.discord_status);
        statusText.classList.add(presence.discord_status);
        statusTextContent = presence.discord_status.charAt(0).toUpperCase() + presence.discord_status.slice(1);
        
        if (presence.discord_status === 'dnd') {
            statusTextContent = 'Do Not Disturb';
        }
    }
    
    statusText.textContent = statusTextContent;
    
    const nonSpotifyActivity = presence.activities?.find(activity => 
        activity.name !== 'Spotify' && activity.type !== 2
    );
    
    if (nonSpotifyActivity) {
        discordActivity.style.display = 'flex';
        activityName.textContent = nonSpotifyActivity.name;
        activityState.textContent = nonSpotifyActivity.details || nonSpotifyActivity.state || '';
        
        if (nonSpotifyActivity.assets?.large_image) {
            const iconUrl = nonSpotifyActivity.assets.large_image.startsWith('mp:')
                ? `https://media.discordapp.net/${nonSpotifyActivity.assets.large_image.slice(3)}`
                : `https://cdn.discordapp.com/app-assets/${nonSpotifyActivity.application_id}/${nonSpotifyActivity.assets.large_image}.png`;
            activityIcon.src = iconUrl;
        } else {
            activityIcon.src = 'https://via.placeholder.com/32';
        }
    } else {
        discordActivity.style.display = 'none';
    }
    
    updateSpotifyStatus(presence);
}

function updateSpotifyStatus(presence) {
    const spotifySection = document.getElementById('spotify-section');
    const spotifyTitle = document.getElementById('spotify-title');
    const spotifyArtist = document.getElementById('spotify-artist');
    const albumCover = document.getElementById('album-cover');
    
    const spotifyActivity = presence.activities?.find(activity => 
        activity.name === 'Spotify' && activity.type === 2
    );
    
    if (spotifyActivity) {
        spotifySection.style.display = 'block';
        spotifyTitle.textContent = spotifyActivity.details || 'Unknown Track';
        spotifyArtist.textContent = `by ${spotifyActivity.state || 'Unknown Artist'}`;
        
        if (spotifyActivity.assets?.large_image) {
            const coverUrl = `https://i.scdn.co/image/${spotifyActivity.assets.large_image.split(':')[1]}`;
            albumCover.src = coverUrl;
            albumCover.style.display = 'block';
        } else {
            albumCover.style.display = 'none';
        }
        
        if (spotifyActivity.timestamps) {
            updateSpotifyProgress(spotifyActivity.timestamps);
        }
    } else {
        spotifySection.style.display = 'none';
        clearInterval(spotifyUpdateInterval);
    }
}

function updateSpotifyProgress(timestamps) {
    const progressFill = document.getElementById('progress-fill');
    const currentTime = document.getElementById('current-time');
    const totalTime = document.getElementById('total-time');
    
    if (!timestamps.start || !timestamps.end) return;
    
    const startTime = timestamps.start;
    const endTime = timestamps.end;
    const duration = endTime - startTime;
    
    function updateProgress() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        progressFill.style.width = progress + '%';
        currentTime.textContent = formatTime(elapsed);
        totalTime.textContent = formatTime(duration);
        
        if (progress >= 100) {
            clearInterval(spotifyUpdateInterval);
        }
    }
    
    clearInterval(spotifyUpdateInterval);
    
    updateProgress();
    
    spotifyUpdateInterval = setInterval(updateProgress, 1000);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

window.addEventListener('beforeunload', function() {
    if (socket) {
        socket.close();
    }
    clearInterval(heartbeatInterval);
    clearInterval(spotifyUpdateInterval);
});


function initCopyFunctionality() {
    const copyElements = document.querySelectorAll('[data-copy]');
    
    copyElements.forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            
            const textToCopy = this.getAttribute('data-copy');
            const type = this.getAttribute('data-type');
            
            copyToClipboard(textToCopy, type);
        });
    });
}

function copyToClipboard(text, type) {
    navigator.clipboard.writeText(text).then(function() {
        showCopyNotification(`${type} copié !`, true);
    }).catch(function(err) {
        console.error('Erreur lors de la copie:', err);
        showCopyNotification(`Erreur lors de la copie`, false);
    });
}

function showCopyNotification(message, success) {
    const existingNotifications = document.querySelectorAll('.copy-notification');
    existingNotifications.forEach(notif => {
        notif.classList.add('hide');
        setTimeout(() => notif.remove(), 400);
    });
    
    const notification = document.createElement('div');
    notification.className = `copy-notification ${success ? 'success' : 'error'}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    initCustomCursor();
    createParticles();
    connectToLanyard();
    initCopyFunctionality();
});
