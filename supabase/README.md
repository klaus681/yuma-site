# Supabase – YUMA Team

## 1. Esegui lo schema
1. Apri Supabase Dashboard → il tuo progetto
2. SQL Editor → New query
3. Incolla tutto il contenuto di `schema.sql`
4. Run

## 2. Crea l'utente admin
1. Authentication → Users → Add user
2. Email: `klaus68@hotmail.it`
3. Password a tua scelta
4. Abilita Auto Confirm User
5. Create user

Il trigger assegna automaticamente role = admin a questa email.

## 3. Config client
URL e anon key sono già in `index.html` e in `config.js`.

**Non** mettere mai la service_role key nel frontend.

## Tabelle
| Tabella | Uso |
|---------|-----|
| site_content | Testi del sito (hero, equipaggio) |
| candidature | Form Unisciti a noi |
| profiles | Ruolo utente (admin / member) |
