# 👑 QUEEN-MD (Multi-user WhatsApp Bot)

## Heroku par deploy
1. Is folder ko GitHub repo me daalo aur Heroku se connect karo (ya `git push heroku`).
2. Heroku → Settings → **Config Vars**:
   - `MONGODB_URI`  = apna MongoDB link (zaroori, apna naya banao)
   - `OWNER_NUMBER` = 923xxxxxxxxx
   - `HEROKU_APP_NAME` = apni app ka naam (keep-alive + `.pair` command ke liye)
   - `ADMIN_KEY` = koi bhi secret (admin routes ke liye, optional)
3. Dyno **web** ON rakho (Procfile: `web: node index.js`).
4. App ka link kholo → number likho → **GET PAIR CODE** → code WhatsApp
   (Linked Devices → Link with phone number) me paste karo.

## Session system
Session (creds + keys) MongoDB me save hoti hai. Heroku restart/redeploy ke baad
sab connected users ka bot khud wapas online ho jata hai. Koi bhi user apna number
daal kar apna bot laga sakta hai.

## Routes
| Route | Kaam |
|---|---|
| `/` | Pair code page |
| `/code?number=92300...` | Pair code (JSON) |
| `/ping` , `/health` | Bot status |
| `/status?number=` | Number connected hai ya nahi |
| `/active?key=ADMIN_KEY` | Connected numbers (admin) |
| `/disconnect?number=&key=ADMIN_KEY` | Session delete (admin) |
| `/connect-all?key=ADMIN_KEY` | Saari saved sessions dobara start (admin) |
