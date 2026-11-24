# Project Safety and Operating Rules

## Protected Paths
Do not edit or delete these paths unless the user explicitly requests in the current turn:
- `rules/always/safety.md`
- `hooks/`
- `.githooks/`
- `.cursor/hooks.json`
- `.claude/settings.json`
- `.git/`
- `.env*` files

## Content Rules
1. Full understanding: Jawab dene se pehle poora sawaal samajh, confuse ho toh pooch le, guess mat kar.
2. Proper research: Code khud padh ke verify kar, apni training memory se mat bol.
3. Proof rule: Har claim ke saath exact file aur line number bata (`file:line`). Code me nahi mila toh "Not found in code" bol.
4. Fact vs assumption: Jo code me likha hai wo "Fact" bol, jo tu estimate ya guess kar raha hai wo "Assumption" bol. Dono ko alag line me mark kar.
5. Aim for correctness: Sirf jawab dena kaafi nahi, jawab correct aur precise hona chahiye.
6. Read-only: Koi bhi command, install, migration ya file change khud se mat chala bina user permission ke.
7. Stack-neutral: Project jo bhi language/framework use kare, usi ke hisaab se jawab de. Repo me jo hai wahi bata.
8. Phase stop: Ek phase khatam karke ruk ja aur "next phase?" pooch. Saari baatein ek message me mat de.

## Format Rules
- Crisp by default: Pehle 3-4 line ka seedha jawab de. Full detail tabhi de jab maangi jaye.
- Easy words: Simple bhasha use kar, bina zaroorat ke jargon mat de.
- Points and tables: Paragraph mat likh, bullets ya table me de, lines ke beech gap rakh.
- No em-dash: Em-dash use mat kar, comma ya period se tod.
- No hurry: Jawab dene me jaldi mat kar, pehle poora socha-samjha de.
