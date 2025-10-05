# Colour Mix

## Introduction

Description will be here

## How to Play

### Playing Online

You can play the game at [https://colourmix.mathia.xyz/](https://colourmix.mathia.xyz/).

### Option 2: Host your own server

#### Requirements

- Node.js (22+)
- npm
- git

#### Installation

1. Clone the repository:

```bash
git clone https://github.com/LeTammo/colourmix.git
```

2. Change to the client directory, install, and build the client:

```bash
cd colourmix/client
npm install
npm run build
npm run start
```

3. Change to the server directory, install, and start the server:

```bash
cd ../server
npm install
npm run build
npm run start
```


## Development

### Requirements

- Node.js (22+)
- npm
- git

### Installation (Development)

1. Clone the repository:

```bash
git clone https://github.com/LeTammo/colourmix.git
```

2. Go into the client directory, install, and start the client in development mode:

```bash
cd colourmix/client
npm install
npm run dev
```

3. Go into the server directory, install, and start the server:

```bash
cd ../server
npm install
npm run dev
```

### TODOs

- [ ] Keep user card selection after disconnect
- [ ] Playtests and retrieving feedback from players
- [ ] Docker compose setup for easy deployment
- [ ] Unit tests
- [ ] Card reveal per round and leaderboard
- [ ] Room management (create/join/leave rooms)
- [ ] Invite codes
- [ ] Room settings (time limit, negative scoring, ...)
- Authentication
    - [ ] Guest
    - [ ] OAuth (Google, GitHub, ...)
- Game Modes
    - [x] Classic (CMYK)
    - [ ] Experimental RGB
- [ ] Server-side request validation
- [ ] (optional) Card animations
- [ ] Mobile friendly UI

---

Have fun playing!