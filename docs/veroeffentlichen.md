# Auf die eigene Domain bei IONOS bringen

Was hochgeladen wird, liegt in **`dist/`** — zwei Dateien, sonst nichts:

```
dist/index.html    die ganze Seite
dist/.htaccess     HTTPS-Umleitung, Sicherheitskopfzeilen, Komprimierung
```

Gebaut wird mit `./build.sh`. Lade **nicht** die `index.html` aus dem
Projektstamm hoch — die ist für den Artifact-Dienst gedacht und hat absichtlich
keinen Doctype (siehe unten, Abschnitt „Warum zwei Fassungen“).

---

## Zuerst prüfen: Domain allein reicht nicht

Eine Domain ist nur der Name. Damit Dateien ausgeliefert werden, brauchst du bei
IONOS zusätzlich **eines von beiden**:

- ein **Hosting-Paket** (Webspace mit SFTP und File Manager), oder
- **Deploy Now**, das kostenlose Angebot von IONOS für Seiten aus einem
  GitHub-Repository.

Wenn in deinem Konto unter „Websites & Shops“ nichts außer der Domain steht, hast
du vermutlich nur die Domain. Dann ist Weg C unten der richtige — der kostet nichts
extra.

---

## Weg A · File Manager im Browser (kein Werkzeug nötig)

Der schnellste Weg, wenn du ein Hosting-Paket hast.

1. Bei IONOS anmelden, zum Hosting-Paket, dort den **File Manager** öffnen
   (je nach Kontoart heißt der Bereich „Webspace“ oder „Webspace verwalten“).
2. In das Verzeichnis wechseln, auf das deine Domain zeigt. Bei der Hauptdomain
   ist das meist direkt der Stamm. Wenn du unsicher bist: unter **Domains** die
   Domain aufrufen, dort steht das Ziel- bzw. Zielverzeichnis.
3. `index.html` hochladen.
4. **Versteckte Dateien einblenden** und `.htaccess` ebenfalls hochladen.
   Der führende Punkt gehört zum Namen; viele Dateiverwaltungen verbergen solche
   Dateien und übergehen sie beim Hochladen stillschweigend.
5. Domain im Browser aufrufen.

Zum Aktualisieren dieselben zwei Dateien überschreiben. Die `.htaccess` sorgt
dafür, dass Besucher sofort die neue Fassung sehen und nicht tagelang eine alte
aus dem Zwischenspeicher.

---

## Weg B · SFTP

Die Zugangsdaten stehen im IONOS-Konto beim Hosting-Paket unter **SFTP & SSH**
(Serveradresse, Benutzername; das Passwort setzt du dort selbst).

Mit einem grafischen Programm wie FileZilla oder auf der Kommandozeile:

```sh
sftp BENUTZER@ZUGANG.ionos.de
# im Verzeichnis der Domain:
put dist/index.html
put dist/.htaccess
```

Oder in einem Rutsch, wenn `rsync` verfügbar ist:

```sh
rsync -av --delete dist/ BENUTZER@ZUGANG.ionos.de:/pfad/zur/domain/
```

**Port 22, SFTP — nicht das alte FTP.** FTP überträgt das Passwort im Klartext.

---

## Weg C · Deploy Now — empfohlen

IONOS Deploy Now hängt sich an ein GitHub-Repository. Nach dem Einrichten wird die
Domain bei **jedem Push automatisch aktualisiert** — auch bei meinen. Das ist die
einzige Variante, bei der ich die Seite tatsächlich für dich veröffentlichen kann,
ohne je Zugangsdaten von dir zu brauchen.

1. In deinem IONOS-Konto **Deploy Now** aufrufen und ein neues Projekt anlegen.
2. GitHub verbinden und das Repository **`syl4r313-lab/projekt`** auswählen,
   Branch `claude/hey-eu-artefakt-interactive-gxwz3t` (oder später `main`).
3. Bei der Projektart **statische Seite** wählen und einstellen:
   - **Build-Befehl:** `./build.sh`
   - **Ausgabeverzeichnis:** `dist`
4. Deine Domain zuweisen. Das SSL-Zertifikat richtet IONOS selbst ein.

Deploy Now legt dafür eine Workflow-Datei unter `.github/workflows/` im Repository
an — das ist normal und darf so bleiben.

Danach genügt ein Push, damit die Domain die neue Fassung zeigt.

---

## Nach dem Hochladen prüfen

- Seite über **`https://`** aufrufen — die Umleitung sollte automatisch greifen.
- **Auf dem Handy öffnen.** Wenn die Seite winzig und herausgezoomt erscheint,
  wurde die falsche `index.html` hochgeladen (die aus dem Projektstamm).
- Auf der Seite mit `Strg`/`Cmd` + `Umschalt` + `R` neu laden und in den
  Entwicklerwerkzeugen unter „Konsole“ nachsehen, ob dort etwas rot steht.
- Prüfen, dass `.htaccess` wirklich angekommen ist: Wenn `http://` nicht auf
  `https://` umleitet, fehlt sie.

---

## Warum zwei Fassungen

Der Artifact-Dienst setzt `<!doctype html>`, `<head>` und `<body>` selbst um den
Inhalt herum. Deshalb enthält `index.html` im Projektstamm nur den Inhalt.

Lädt man genau diese Datei auf einen eigenen Server, fehlen beide Dinge:

- **Ohne Doctype** schaltet der Browser in den Quirks-Modus, einen Nachbau des
  Verhaltens der Neunzigerjahre. Abstände und Größen werden dann anders berechnet.
- **Ohne `<meta name="viewport">`** nimmt ein Handy an, die Seite sei für einen
  Bildschirm von rund 980 Pixeln gemacht, und zoomt das Ganze heraus.

`dist/index.html` hat beides, dazu Sprache, Beschreibung, Vorschautext für geteilte
Links und ein eingebettetes Favicon. Beide Fassungen entstehen aus denselben Quellen
in `src/`, es gibt also nichts doppelt zu pflegen.

---

## Was auf einer öffentlichen Domain gilt

Die Seite ist eine Vorführung, kein Betrieb. Wenn tatsächlich Jugendliche darauf
zugreifen sollen, gilt:

- **Die PIN `2468` steht sichtbar im Quelltext.** Ohne Server lässt sich das nicht
  ändern — jede Prüfung im Browser ist nur eine Höflichkeitsschranke. Für echten
  Einsatz siehe `docs/server-skizze.md`.
- **Alle Daten bleiben im jeweiligen Browser.** Zwei Personen auf zwei Geräten
  sehen nichts voneinander. Auch das braucht den Server.
- **Ein Impressum ist in Deutschland Pflicht**, sobald eine Seite öffentlich
  erreichbar ist. Bei Angeboten für Minderjährige zusätzlich eine
  Datenschutzerklärung — auch wenn hier nichts das Gerät verlässt, muss genau das
  dort stehen.
