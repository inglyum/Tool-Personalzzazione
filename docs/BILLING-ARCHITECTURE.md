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
