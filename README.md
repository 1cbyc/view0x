# secure-audit

okay, today is a new day on my one project daily aim, and i am trying to build a smart contract audit tool. i noticed people i taught in 2021 became a big deal in just 18 months of work. the universe rewards those who put in their efforts and try their best.

to be honest, i have to perfect everything with the yarn setup and then i setup docker for this to work efficiently.

finally, the vuln scanner is working fine without errors. but i think it is not detecting vulnerabilities, gas optimizations or coe quality issues, because i intentionally used bad code from one hack for this. but i think this is because some detection methods i used are still stubs and need more robust AST traversal logic.

maybe because i am not much of a ui guy, so i want to perfect the vuln detection method before doing anything about the frontend/backend integration or even the UI itself. 

So, I will implement tx.origin usage detection, unchecked external calls, weak randomness sources, missing access control, and dangerous delegatecall usage before i sleep.

i am used to getting my setup run properly on cli before trying to add a web ui for it. just to feel like a god!

okay, let me just work up the frontend at this point. let's even see what i have going. i downgraded my express from 5.x to 4.x and it is smooth now. backend running fine, time to get back to the frontend. some org wasted my time for an interview that never held, and while at it i lost funds i requested withdrawal for, i guess life is not fair.

freaking pissed, because why on earth would tailwind be causing so much errors.

okay, i use this method:

```bash
secure-audit/
├── scanner-engine/     # Core analysis engine
├── backend/           # Express.js API server
├── frontend/          # React application
├── docs/             # Documentation
└── docker-compose.yml # Container orchestration
```


i just realized i hardcoded it to localhost:3001/api/analysis/public. that is why when i shut down my pc it does not scan. anyways, in api.ts i have fixed it to take from render where i updated the api.

```tsx
import { contractApi } from '../services/api';
```

okay, in the end, i simply setup a wrangler for cloudflare workers to get it running well.

```bash
# wanted to know the list of what's here in the frontend
cd frontend; Get-ChildItem dist
# trying to get list of deployed pages:
npx wrangler pages deploy dist --project-name secure-audit-frontend
# tried to get the list of urls o
npx wrangler pages domain list --project-name secure-audit-frontend
# then i did this
npx wrangler pages deploy dist --project-name secure-audit
```