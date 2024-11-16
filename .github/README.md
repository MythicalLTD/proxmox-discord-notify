# Proxmox Discord Notify

A script to send proxmox tasks to discord using webhooks &lt;3!

Support Server:
- https://discord.gg/mythicalsystems-ltd-1175092855421800570

## Installation

To install this you need to first install nodejs on your server:

### Install Node Version Manager

To install nodejs you first need a version manager: 

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

### Add Node Version Manager

To add node version manager to path you have to run: 

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

### Installing NodeJs (20)

To install nodejs 20 you have to run:
```bash
nvm install 20 
```

### Installing Requirements

You have to install some requirements
```bash
npm i -g pm2 # Global requirement for 24/7
npm i # Execute this where the source code is
```

### Config the bot

You will first have to modify the config file

```bash
mv config-example.json config.json
nano config.json
```

### Starting the bot

All that left is to make it run!

```bash
pm2 start index.js
pm2 save
pm2 startup
```