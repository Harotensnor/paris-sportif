# Message court a envoyer a Claude

J'ai un pack d'audit complet de mon projet Paris-Sportif.

Je ne veux pas que tu appliques tout aveuglement : je veux que tu juges selon mon historique avec toi, mes preferences et la strategie produit.

Lis d'abord :

1. `MASTER_INDEX.md`
2. `04_RESUMES_POUR_CLAUDE/TOP_FINDINGS_A_ARBITRER.md`
3. `09_BACKEND_ROOT_CAUSE/ROOT_CAUSE_BACKEND.md`
4. `06_ANALYSES_SUPPLEMENTAIRES/QUALITE_DATA_SIGNAL.md`
5. `11_BACKLOG_ET_TICKETS/TICKETS_CLAUDE.md`

Les points qui semblent les plus importants :

- stats football contaminees par des donnees NBA ;
- cotes externes possiblement utilisees avant Winamax exact ;
- `winamax.available` trop ambigu ;
- health/Sante trop optimiste ;
- meteo parfois geocodee au mauvais endroit.

Propose-moi d'abord ton arbitrage et ton plan, puis seulement ensuite on code.

