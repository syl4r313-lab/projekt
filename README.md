# hey EU — Europa im Skizzenbuch

Eine interaktive Webseite zum „hey EU“-Artefakt, gerichtet an ältere Jugendliche.
Alles, was im Spiel möglich ist, lässt sich hier direkt auf der Seite tun.

Die Seite ist eine einzige Datei ohne externe Abhängigkeiten: **`index.html`**.
Öffnen genügt, es wird kein Server gebraucht. Alle Daten bleiben im Browser
(`localStorage`), nichts wird gesendet.

## Was drin ist

| Station | Was man tun kann |
|---|---|
| 01 Profil | Anzeigename (wird live vom Wortfilter geprüft), Land, Alter, bis zu vier Interessen, Stiftfarbe; gezeichnetes Porträt, das dem Mauszeiger folgt |
| 02 Karte | Europa aus den Original-Kartendaten, von Hand gezeichnet. Überfahren schraffiert ein Land, Klicken öffnet den Steckbrief und lässt die Figur dorthin laufen; Pfeiltasten/WASD bewegen sie Feld für Feld. Jedes erreichte Wahrzeichen und jede richtige Frage bringt Punkte |
| 03 Leute treffen | 25 Jugendliche (einer pro Land) und vier Lehrkräfte. Überfahren zeigt eine Randnotiz, Klicken öffnet das Gespräch — mit Vorschlägen, freiem Text und Wortfilter |
| 04 Aufgaben | Aufgaben als Zettel an der Wand; Beitrag mit Text und Bild einreichen, Status „in Prüfung“ / „freigegeben“ |
| 05 Lehrkräfte-Bereich | Getrennter Zugang per PIN. Aufgaben einstellen und zurückziehen, eingereichte Beiträge freigeben oder mit Anmerkung zurückgeben |
| 06 Wortfilter | Der Filter zum Ausprobieren: zeigt Schritt für Schritt, wie Verschleierungen mit Zahlen, Leerzeichen und gedehnten Buchstaben aufgelöst werden |

**Demo-PIN für den Lehrkräfte-Zugang: `2468`**

## Gestaltung

Kariertes Schulheft mit roter Randlinie. Die Kästen haben keine CSS-Rahmen,
sondern gezeichnete Striche: jede Kante wird aus mehreren leicht versetzten
Segmenten gebaut und doppelt nachgezogen. Ein `ResizeObserver` zeichnet sie neu,
sobald sich ein Kasten ändert.

Drei Schriftrollen: bookige Serife für Überschriften, System-Sans für Fließtext,
Monospace für Zahlen, Zustände und Randnotizen. Keine Webfont-Verweise.

Im dunklen Modus wird aus dem Heft eine **Schiefertafel** — Kreide auf Schiefer,
statt einer bloßen Umkehrung der Farben. Umgeschaltet wird über die
Systemeinstellung oder `data-theme` am Wurzelelement.

Alle Bewegung respektiert `prefers-reduced-motion`.

## Herkunft der Daten

Kartenraster, Länderzuordnung, Fährverbindungen und der komplette Wortfilter
stammen unverändert aus dem Spiel-Artefakt. Personen, Texte, Fragen und Aufgaben
sind für ältere Jugendliche neu geschrieben.

## Aufbau

`index.html` wird aus vier Teilen in `src/` zusammengesetzt:

```
cat src/01-head.html src/02-body.html src/03-data.js src/04-app.js > index.html
```

- `01-head.html` — Titel und Stil
- `02-body.html` — Aufbau der Seite
- `03-data.js` — Länder, Personen, Aufgaben, Kartenraster, Wortfilterlisten
- `04-app.js` — gezeichnete Rahmen, Porträts, Karte, Gespräche, Aufgaben, Rollen
