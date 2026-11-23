# Стиль обложек статей

Обложка — иллюстрация 16:9 (1600×900 или 1376×768) в стиле тёмной ризографии / бумажного коллажа.

## Правила

- **Фон:** почти чёрный (#111), лёгкое зерно бумаги.
- **Цвета:** кремовая «бумага» (#efe8d8) + **один** акцент на статью:
  зелёный #3dbb78, синий #2f5cff, коралловый #f06a5a или янтарный #f0a830.
- **Фактура:** полутоновые точки (растр), вырезки из бумаги с неровными краями,
  лёгкий сдвиг цвета, как при печати не в приводку.
- **Метки:** глобус в левом верхнем углу, прицелы-перекрестия по краям, линейки с делениями,
  уголки кадрирования.
- **Сюжет:** 2–4 крупных предмета, которые прямо говорят о теме (буквы — для шрифтов,
  бюст и плёнка — для фото, радар и курсор — для UX). Без текста-заголовка на картинке.

## Промпт для генератора

```
Dark risograph print collage, 16:9. Near-black paper background with subtle grain.
Cream paper cut-outs and one accent colour: {ACCENT}. Heavy halftone dot texture,
slightly misregistered print. Thin cream line icons: a globe in the top-left corner,
small crosshair registration marks near the edges, measuring rulers with ticks,
corner crop marks. Main subject, large and centred: {SUBJECT}.
Flat editorial illustration, no readable text, no logos, no people's faces.
```

`{ACCENT}` — например `emerald green (#3dbb78)`; `{SUBJECT}` — 2–4 предмета по теме статьи.

## Куда загружать

Админка → «Статьи» → статья → «Выбрать обложку». Описание обложки — на обоих языках.
Без своей обложки сайт нарисует её сам в том же стиле (`src/lib/cover.ts`).
