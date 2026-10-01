# My Typewriter

A little typewriter for small writers. Made for iPad, but it works on phones and computers too.
Plain HTML/CSS/JS with no build step. It's a PWA, so it works offline and everything is saved locally on the device.

- Type on the round on-screen keys (Swedish layout, ABC/abc toggle) or on a connected keyboard.
- The carriage slides as you type. A bell rings near the end of the line, and the carriage returns by itself at the margin (or with the red lever / return key).
- A paper holds 36 × 22 characters. When it's full, the next page feeds in, so one paper can have several pages.
- **Spara** moves the paper into the folder. **Släng** crumples it into the trash, which you can undo (the trash keeps papers for 30 days).
- **Titta** zooms the paper up so the whole thing (all pages) can be read; tap outside or ✕ to put it back.
- **Öva** (in the Lek menu): faint letters on the paper to type over, one word per line. Only the right key types, every finished word gets a stamp, and hints glow on the on-screen keyboard (never for a hardware keyboard). Three levels, picked with the 1-2-3 buttons over the paper: letters (the classic touch-typing order: F and J first, then outwards across the home row, the top row and the bottom row), short words, long words. Switching Öva on puts the current paper in the folder and starts a fresh one. The stopwatch button starts a **time trial**: one minute on the current level, as many stamps as possible, then a result card (fanfare and confetti for a new record; records are kept per level).
- **Lek** (play mode): every key types the next letter of a ready-made silly text: *Författare*, *Jobb*, *Forskare* (serious volcano research notes) or *Brev*. The texts live in `js/texts.js`.
- **Settings** (the gear in the top row on wide screens, a tab on the right edge on narrower ones, or tap the nameplate): the machine's name (shown on the plate), colour, paper type (plain, lined, squared, old) and the on-screen keyboard. A hidden keyboard also comes back with a tap or swipe on the machine.
- **Stämpla**: a drawer of rubber stamps (volcano, star, heart, sun, cat, flower) in four inks. Pick one and tap the paper; backspace right after lifts the last stamp off again.
- **Spara** rolls the paper back to the top and stamps the date in the corner before it goes into the folder.
- **Emoji keys** on a physical keyboard (made for the Logitech POP Keys): on an iPad they only arrive as a lone Control press, so each press prints the next of a set of small pictures (😀 ⭐ 🌋 🐱 🌞 …) in typewriter ink. `keytest.html` shows what a keyboard actually sends.
- In the folder: *Skriv vidare* (continue writing), *Skicka i kuvert* (the letter folds into an envelope; write who it's to and share the envelope and the pages as images), *Spara som bild* (one PNG per page) and *Spara som text* (.txt). On iPad these open the share sheet: Save Image, Save to Files, AirDrop…

## Good to know

- **Add it to the Home Screen** (Share → Add to Home Screen). Safari may clear data for websites that haven't been visited for 7 days, but Home Screen apps are exempt. Safari and the Home Screen app also keep separate storage.
- The sounds are synthesized with Web Audio (no audio files). The iPad's silent switch mutes them.
- When you release a new version, bump `VERSION` in `sw.js` so installed apps pick up the new files.

## Files

| | |
|---|---|
| `js/app.js` | typewriter: carriage, pages, save / trash flows |
| `js/layout.js` | paper grid (columns, rows, margins) |
| `js/ink.js` | deterministic uneven ink per character |
| `js/keyboard.js` | on-screen keyboard |
| `js/sound.js` | synthesized typewriter sounds |
| `js/crumple.js` | crumple + toss animation |
| `js/folder.js` | folder, trash and detail views |
| `js/export.js` | PNG / TXT export and sharing |
| `js/storage.js` | localStorage (`mt_*` keys) |

Font: [Special Elite](https://fonts.google.com/specimen/Special+Elite) (Apache 2.0), bundled in `fonts/`.
