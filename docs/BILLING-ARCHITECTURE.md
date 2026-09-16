# Fatturazione — l'architettura, non l'integrazione

**Nessun pagamento reale è collegato, e nessuno è simulato.** Questo documento
descrive dove andrà, non che cosa fa oggi.

## Le entità, separate

    Customer → Subscription → Plan → Price
                    ↓
              Invoice → Payment
                    ↓
            Subscription Event

`plans` e `plan_prices` esistono già in `plan-catalog.js`. `subscriptions`
esiste in `subscription.js`. Mancano `invoices`, `payments` e
`subscription_events`, che sono ciò che un provider restituisce.

## La regola quando un provider sarà collegato

**Il provider diventa la fonte di verità per lo stato del pagamento.**
`subscription.status` smette di essere deciso dall'applicazione e comincia a
essere ricevuto: un webhook aggiorna, l'applicazione legge. Tenere due verità
su chi ha pagato è il modo classico di dare accesso a chi non ha pagato, o di
negarlo a chi ha pagato.

## L'adapter

    BillingProvider          l'interfaccia
      StripeBillingProvider  quando ci sarà una chiave
      MockBillingProvider    solo per i test

Il Mock **non deve mai finire in una build commerciale come provider attivo**.
Un pagamento finto che risulta riuscito è peggio di nessun pagamento.

## Quello che c'è già

Il file `117` contiene un abbozzo di Stripe Payment Links letti da
`localStorage['ingly_stripe_links']`. Funziona per un lancio manuale — si
configura un link per piano — ma **non riceve webhook**, quindi non sa se un
pagamento è andato a buon fine. Va trattato come un ponte temporaneo, non come
l'integrazione.

## Limitazione dichiarata

Finché non c'è un backend, l'attivazione di un piano dopo il pagamento è
manuale. Preferire questo a un'attivazione automatica basata sul ritorno del
browser: quel ritorno lo può falsificare chiunque.

---

# Aggiornamento — `InglyFatturazione` (`src/product/billing.js`)

Il documento qui sopra descriveva dove sarebbe andata la fatturazione. Adesso
il confine esiste, e questa sezione descrive che cosa fa davvero.

## Due sole strade verso «attivo»

1. **`richiedi(planId, intervallo)`** manda chi vuole pagare dal fornitore
   configurato e registra la richiesta in `db.billing_requests`. Non attiva
   niente. Se non è configurato nessun fornitore, lo dice apertamente e
   propone il contatto diretto — non finge che sia andata.
2. **`applica(evento)`** prende un evento **del fornitore** e lo riporta
   sull'abbonamento. È l'unico punto che può muovere lo stato verso «pagato»,
   e pretende cinque campi: `id`, `type`, `tenant_id`, `provider`,
   `provider_subscription_id`. Se ne manca uno, l'evento viene rifiutato e
   dice quale: senza un riferimento esterno non è un evento del fornitore, è
   un'attivazione scritta a mano.

Non esiste una terza strada, e `tests/fatturazione.test.mjs` verifica anche il
sorgente: nessun `status: 'active'` scritto a mano in `billing.js`, nessun
adattatore finto nel percorso di produzione.

## Mappa degli eventi

| `type` del fornitore | azione sull'abbonamento |
| --- | --- |
| `checkout.completed` | `attiva` |
| `invoice.paid` | `rinnova` |
| `invoice.payment_failed` | `segnaNonPagato` (7 giorni di tolleranza, l'accesso resta) |
| `subscription.deleted` | `disdici` |

Un tipo non elencato non fa niente e lo dice.

## Idempotenza

Gli eventi dei fornitori arrivano più di una volta: è normale ed è
documentato. Ogni evento applicato si registra in `db.billing_events` col suo
`id`; se quell'`id` è già passato, la seconda volta non fa niente e risponde
`{ ok: true, ripetuto: true }`.

La conseguenza che conta: **un rinnovo applicato due volte non regala un
mese.** È il test che protegge il ricavo.

## Decisioni che non muovono denaro

Disdetta e riattivazione **non** passano dal fornitore, perché farle dipendere
da una rete che può non rispondere vorrebbe dire lasciare qualcuno abbonato
contro la sua volontà.

| Operazione | Effetto |
| --- | --- |
| `disdici(tenantId)` | `cancelled`, accesso fino alla fine del periodo già pagato |
| `riattiva(tenantId)` | torna a `active`/`trial` — **solo dentro il periodo**. Fuori periodo serve un nuovo pagamento, altrimenti si regalerebbe un periodo |
| `cambiaPiano(tenantId, planId, intervallo)` | in **salita** rimanda a `richiedi()` e non cambia niente; in **discesa** registra `pending_plan_id` e si applica al rinnovo, per non togliere subito funzioni già pagate |

## Che cosa manca ancora

Il webhook vero: oggi `applica()` esiste e funziona, ma nessuno lo chiama —
non c'è un backend che riceva le chiamate di Stripe. Finché non c'è,
l'attivazione dopo il pagamento è un'operazione che qualcuno compie
consapevolmente con i dati del fornitore in mano. È meno comodo di
un'attivazione automatica basata sul ritorno del browser, ed è l'unica cosa
onesta: quel ritorno lo può falsificare chiunque.
