const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Discord Configuration
const DISCORD_WEBHOOK_URL = config.DISCORD_WEBHOOK_URL;
const CHECK_INTERVAL = config.CHECK_INTERVAL;

// The file to store sent tasks
const SENT_TASKS_FILE = config.SENT_TASKS_FILE;
// The task types to be notified
const TASK_TYPES = config.TASK_TYPES;
// Maximum size of the sent tasks file in bytes
const MAX_SENT_TASKS_FILE_SIZE_MB = config.MAX_SENT_TASKS_FILE_SIZE_MB;

//Proxmox Node
const PROXMOX_NODE = config.PROXMOX_NODE;

// Math to convert MB to bytes
const MAX_SENT_TASKS_FILE_SIZE = MAX_SENT_TASKS_FILE_SIZE_MB * 1024 * 1024; // Convert MB to bytes

// Function to check and trim the sent tasks file if it exceeds the maximum size
function checkAndTrimSentTasksFile() {
    const stats = fs.statSync(SENT_TASKS_FILE);
    if (stats.size > MAX_SENT_TASKS_FILE_SIZE) {
        const data = fs.readFileSync(SENT_TASKS_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        const trimmedData = parsedData.slice(parsedData.length / 2); // Keep only the second half of the array
        fs.writeFileSync(SENT_TASKS_FILE, JSON.stringify(trimmedData), 'utf8');
        sentTasks = new Set(trimmedData);
        console.log(`${new Date()}: Trimmed sent tasks file to reduce its size.`);
    }
}

// Check and trim the sent tasks file at startup
if (fs.existsSync(SENT_TASKS_FILE)) {
    checkAndTrimSentTasksFile();
}

// Function to send notification to Discord
async function sendDiscordNotification(message) {
    message.username = `PROXMOX Monitor [${PROXMOX_NODE}]`;
    console.log(`${new Date()}: Sending notification to Discord: ${message}`);
    try {
        await axios.post(DISCORD_WEBHOOK_URL, message, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(`${new Date()}: Notification sent.`);
    } catch (error) {
        console.error(`${new Date()}: Error sending notification: ${error}`);
    }
}

// Send a server online message at startup
sendDiscordNotification({
    embeds: [{
        title: '🟢 Server Online',
        color: 3066993,
        description: 'The Proxmox Discord Notify service has started and is now monitoring tasks.',
        footer: {
            text: 'Proxmox Notification Service',
            icon_url: 'https://www.proxmox.com/images/proxmox/Proxmox_logo_standard_hex_400px.png'
        },
        timestamp: new Date()
    }]
});

// Load sent tasks from file
let sentTasks = new Set();
if (fs.existsSync(SENT_TASKS_FILE)) {
    const data = fs.readFileSync(SENT_TASKS_FILE, 'utf8');
    const parsedData = JSON.parse(data);
    sentTasks = new Set(parsedData);
}

// Function to check if a task has been sent
function taskAlreadySent(taskId) {
    return sentTasks.has(taskId);
}

// Function to mark a task as sent
function markTaskAsSent(taskId) {
    sentTasks.add(taskId);
    fs.writeFileSync(SENT_TASKS_FILE, JSON.stringify(Array.from(sentTasks)), 'utf8');
}

// Main loop
setInterval(async () => {
    try {
        exec('pvesh get /cluster/tasks --output json-pretty', (error, stdout, stderr) => {
            if (error) {
                console.error(`${new Date()}: Error executing command: ${error}`);
                return;
            }
            if (stderr) {
                console.error(`${new Date()}: Command stderr: ${stderr}`);
                return;
            }
            const tasks = JSON.parse(stdout);
            tasks.forEach(task => {
                const taskId = task.upid;
                if (taskAlreadySent(taskId) || !TASK_TYPES.includes(task.type) || !task.upid || !task.id || !task.endtime) {
                    return;
                }
                const message = {
                    embeds: [{
                        title: '🚀 Proxmox Task Notification',
                        color: 16776960, // Yellow color
                        fields: [
                            { name: '🖥️ Node', value: `\`${task.node || 'N/A'}\``, inline: true },
                            { name: '⚙️ Type', value: `\`${task.type || 'N/A'}\``, inline: true },
                            { name: '📊 Status', value: `\`${task.status || 'N/A'}\``, inline: false },
                            { name: '👤 User', value: `\`${task.user || 'N/A'}\``, inline: true },
                            { name: '⏰ Start Time', value: `\`${new Date(task.starttime * 1000).toLocaleString()}\``, inline: true },
                            { name: '⏱️ End Time', value: task.endtime ? `\`${new Date(task.endtime * 1000).toLocaleString()}\`` : 'N/A', inline: true }
                        ],
                        footer: {
                            text: 'Proxmox Notification Service',
                            icon_url: 'https://www.proxmox.com/images/proxmox/Proxmox_logo_standard_hex_400px.png'
                        },
                        timestamp: new Date()
                    }]
                };

                setTimeout(() => {
                    sendDiscordNotification(message);
                    markTaskAsSent(taskId);
                }, 1000 * tasks.indexOf(task)); // Delay each notification by 1 second
            });
        });
    } catch (error) {
        console.error(`${new Date()}: Error fetching tasks from API: ${error}`);
    }
}, CHECK_INTERVAL);

// Prevent script from exiting
process.on('uncaughtException', (err) => {
    console.error(`${new Date()}: Uncaught Exception: ${err}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`${new Date()}: Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('SIGINT', () => {
    console.log(`${new Date()}: Exiting...`);
    
    // Send a server offline message
    sendDiscordNotification({
        embeds: [{
            title: '🔴 Server Offline',
            color: 15158332,
            description: 'The Proxmox Discord Notify service has stopped and is no longer monitoring tasks.',
            footer: {
                text: 'Proxmox Notification Service',
                icon_url: 'https://www.proxmox.com/images/proxmox/Proxmox_logo_standard_hex_400px.png'
            },
            timestamp: new Date()
        }]
    }).then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error(`${new Date()}: Error sending offline notification: ${error}`);
        process.exit(1);
    });
});

console.log(`${new Date()}: Proxmox Discord Notify service started. Monitoring tasks...`);