# INGLY OS come SaaS — l'architettura

    AUTH USER → TENANT → SUBSCRIPTION → PLAN → ENTITLEMENTS → ROLE → FEATURE

Sei strati, ognuno con un modulo, nessuno che ne duplica un altro.

| Strato | Modulo | Che cosa decide |
| --- | --- | --- |
| Identità | `auth-identity.js` | chi sei |
| Workspace | `tenant_id` su utente e abbonamento | dove sei |
| Abbonamento | `subscription.js` | se sei in regola |
| Listino | `plan-catalog.js` | che cosa comprende il tuo piano |
| Diritti | `entitlements.js` | che cosa puoi fare **adesso** |
| Interfaccia | `saas-view.js` | che cosa vedi |

## La regola che tiene tutto

**Un diritto non si memorizza mai.** Si calcola, a ogni domanda, da
abbonamento → stato → piano → funzioni. Se l'abbonamento scade non serve
cancellare nulla: la funzione smette di rispondere `true` perché il conto
torna a dirlo.

È l'opposto di com'era: la sessione conteneva `plan` e `modules`, e cambiarli
voleva dire cambiare piano da una riga di `localStorage`.

## Il confine con il server

Questo strato decide **che cosa mostrare**. Non è, e non può essere, l'ultima
parola: un client non può difendersi da sé stesso. Quando i dati staranno su
Supabase la parola definitiva sarà delle policy RLS, e questo strato resterà a
decidere l'interfaccia. Le due cose devono dire lo stesso, e per questo
leggono lo stesso catalogo.

**Non spostare qui una decisione di sicurezza che il server deve prendere.**

## Dove vivono i dati

`InglyRepository` è già lo strato di accesso: il dominio non conosce
IndexedDB. Vedi `docs/SUPABASE-READINESS.md` per le tabelle candidate.
