#!/bin/sh
# Baut beide Fassungen aus src/:
#
#   index.html       – für den Artifact-Dienst. Der setzt doctype, <head> und
#                      <body> selbst, deshalb enthält diese Datei nur Inhalt.
#   dist/index.html  – für eigenes Hosting. Vollständiges Dokument mit Doctype,
#                      Sprache, Viewport und Metadaten.
#
# Ohne Doctype rendert der Browser im Quirks-Modus, ohne Viewport-Meta zeigt
# ein Handy die Seite in Desktopbreite. Beides ist beim Hochladen sichtbar.

set -eu
cd "$(dirname "$0")"

TEILE="src/01-head.html src/02-body.html src/03-data.js src/04-app.js"

# --- Fassung für den Artifact-Dienst ---
cat $TEILE > index.html

# --- Fassung fürs eigene Hosting ---
mkdir -p dist

BESCHREIBUNG="Eine Austauschplattform fuer Jugendliche aus 25 Laendern: gezeichnete Europakarte, Begegnungen, Aufgaben und ein getrennter Lehrkraefte-Zugang."

# Favicon: das Signet als SVG, direkt eingebettet – keine zweite Datei,
# kein zusaetzlicher Abruf.
FAVICON=$(printf '%s' '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="6" fill="%23faf9f5"/><text x="32" y="41" font-family="Georgia,serif" font-size="27" font-weight="700" fill="%232f4f8f" text-anchor="middle">EU</text><path d="M13 49C26 45 43 45 51 49" stroke="%23cf4a37" stroke-width="4" fill="none" stroke-linecap="round"/></svg>')

{
  printf '%s\n' '<!doctype html>'
  printf '%s\n' '<html lang="de">'
  printf '%s\n' '<head>'
  printf '%s\n' '<meta charset="utf-8">'
  printf '%s\n' '<meta name="viewport" content="width=device-width, initial-scale=1">'
  printf '%s\n' "<meta name=\"description\" content=\"$BESCHREIBUNG\">"
  printf '%s\n' '<meta name="color-scheme" content="light dark">'
  printf '%s\n' '<meta name="theme-color" content="#faf9f5" media="(prefers-color-scheme: light)">'
  printf '%s\n' '<meta name="theme-color" content="#1e242b" media="(prefers-color-scheme: dark)">'
  printf '%s\n' '<meta property="og:type" content="website">'
  printf '%s\n' '<meta property="og:title" content="hey EU — Europa im Skizzenbuch">'
  printf '%s\n' "<meta property=\"og:description\" content=\"$BESCHREIBUNG\">"
  printf '%s\n' '<meta property="og:locale" content="de_DE">'
  printf '%s\n' "<link rel=\"icon\" href=\"data:image/svg+xml,$FAVICON\">"
  printf '%s\n' '<style>body{margin:0}img{max-width:100%}</style>'
  printf '%s\n' '</head>'
  printf '%s\n' '<body>'
  cat $TEILE
  printf '%s\n' '</body>'
  printf '%s\n' '</html>'
} > dist/index.html

cp deploy/.htaccess dist/.htaccess

printf 'index.html       %s\n' "$(wc -c < index.html | tr -d ' ') Bytes"
printf 'dist/index.html  %s\n' "$(wc -c < dist/index.html | tr -d ' ') Bytes"
printf 'dist/.htaccess   %s\n' "$(wc -c < dist/.htaccess | tr -d ' ') Bytes"
