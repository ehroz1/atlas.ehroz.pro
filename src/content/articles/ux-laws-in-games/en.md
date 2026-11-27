---
title: "Laws of UX in video games: 7 lessons for websites"
description: "Hick's law, Fitts's law, the Zeigarnik effect and four more UX principles, shown through video game interfaces and turned into advice for websites."
type: howto
primaryKeyword: "laws of ux"
secondaryKeywords: ["laws of ux examples", "hick's law", "fitts's law", "game ui design"]
tools: ["laws-of-ux", "interface-in-game", "mobbin"]
categories: ["development", "inspiration"]
published: 2026-11-23
updated: 2026-11-23
trendSource: "Topic idea; steady search demand for laws of UX from designers"
sources:
  - "https://lawsofux.com/"
  - "https://www.interfaceingame.com/"
  - "https://mobbin.com/"
steps:
  - name: "Pick the relevant UX laws"
    text: "Open Laws of UX and choose two or three principles that match the problem on your screen (choice overload, button placement, or perceived speed)."
  - name: "Inspect how games solve the pattern"
    text: "Browse Interface In Game by UI element (menu, HUD, inventory) to see how games keep that interaction fast under pressure."
  - name: "Verify in shipped web and mobile apps"
    text: "Check the same UI flow on Mobbin in real production apps before drawing your own layout."
faq:
  - q: "How many items should a main navigation menu have according to Hick's law?"
    a: "Keep top-level navigation to 5–7 items and group the rest into submenus, filters or search. Limiting simultaneous choices reduces decision time."
  - q: "What is the minimum touch target size for mobile buttons under Fitts's law?"
    a: "Interactive buttons and chips on touch screens should be at least 44×44 CSS pixels (or 40 px minimum for secondary chips) and placed within thumb reach in the lower half of the viewport."
  - q: "Why is 400 milliseconds important in the Doherty threshold?"
    a: "When an interface responds in under 400 ms—with an active button state, skeleton shimmer or progress bar—users stay in flow instead of feeling that the page has frozen."
cover: "./cover.jpg"
coverAlt: "A risograph-style collage: a radar, a crosshair cursor, a game pad cross and website wireframes on black with green accents"
---

The laws of UX are short rules about how people deal with interfaces: how many options they can take in, how fast they hit a button, what they remember. [Laws of UX](/tool/laws-of-ux/) collects them, and they are easiest to see in video games, where an interface has to work in a split second or the player loses. Here are seven of them, what they look like in games, and what to take from each for a website or an app.

For screenshots of game menus, HUDs and inventories, browse [Interface In Game](/tool/interface-in-game/). To see the same ideas in shipped apps, use [Mobbin](/tool/mobbin/).

![Laws of UX: each principle explained briefly, with an illustration](shot:laws-of-ux)

## 1. Hick's law: fewer options, faster choice

The time it takes to decide grows with the number and complexity of choices. That's why many shooters use a weapon wheel of six to eight slots instead of a long list: there is no time to read a list mid-fight.

**On a website:** five to seven items in the main menu, the rest in submenus or search. Three pricing plans, not six. If there really are many options, split the choice into steps.

## 2. Fitts's law: make important things big and close

The bigger and closer a target is, the faster and more accurately people hit it. Games make the main actions large and map them to the thumb on a controller or to the easiest keys.

**On a website:** the main button is large and next to what the person was just looking at. On a phone, put it in the lower half of the screen, within thumb reach. Tiny links for important actions are a common reason nobody uses them.

## 3. Jakob's law: work like everything else

People spend most of their time in other products and expect yours to work the same way. In games that means WASD and the mouse, Esc to pause, I for inventory. A new game with a different layout is annoying for the first half hour.

**On a website:** the logo goes home, the cart sits top right, search is a magnifying glass. Spend originality on content and visual language, not on where the menu is.

![Interface In Game: menus, HUDs and inventories, searchable by game and by element](shot:interface-in-game)

## 4. The Zeigarnik effect: unfinished things hold attention

People remember unfinished tasks better than finished ones. A quest log showing "2 of 5" is why it's hard to stop playing "right here".

**On a website:** show what's left: "profile 60% complete", a checklist of first steps, ticked-off lessons in a course. It works while the list is honest and short, not endless.

## 5. The goal-gradient effect: closer to the finish, faster

People work harder the closer they are to a goal. An experience bar near the next level is the classic case: with a sliver left, the player does "one more mission".

**On a website:** progress in multi-step forms ("Step 2 of 3"), a counter to free delivery, a loyalty card with a couple of stamps already on it. Not starting progress at zero is part of the same idea.

## 6. The peak-end rule: the best and the last moments stick

People judge an experience by its most intense moment and its end, not by the average. That's why games put so much into the results screen: stats, rewards, animation.

**On a website:** don't skimp on the "Order placed" or "Done" screen. It's the last thing people see and how they'll remember the whole process. A well-written error message can be a peak too, a good one.

## 7. The Doherty threshold: respond in under 400 ms

When a system responds in under about 400 milliseconds, people stay in the flow. Games react to a press instantly, with a sound, a flash or an animation, even when the action itself takes time.

**On a website:** a pressed button changes at once, a skeleton replaces a blank screen, long operations show progress. Speed people can see matters more than speed in milliseconds.

![Mobbin: the same patterns in real apps, searchable by pattern](shot:mobbin)

## How to use this

1. Open [Laws of UX](/tool/laws-of-ux/) and pick the two or three laws closest to your problem.
2. Look at how games solve it on [Interface In Game](/tool/interface-in-game/), by element: menu, inventory, HUD.
3. Check the same pattern in apps on [Mobbin](/tool/mobbin/), and only then draw your own version.

More resources for learning design are in the [Development & Learning](/category/development/) category.
