# NutriScan

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People keeping a personal food log and reviewing their daily nutrition. More specific audience segments have not been confirmed.

## Product Purpose

Photo scanning and quick meal logging, and understanding daily nutrition and trends, must receive equal emphasis. The user confirmed this priority on 2026-11-27.

## Operating Context

Responsive website, also used through an Android wrapper. The user has supplied both desktop and phone screenshots. Photos are uploaded or captured, analysed, reviewed for portions, and logged. Saved foods can be logged again.

## Capabilities and Constraints

- Existing React 18 application with Express API, account sign-in, Google sign-in, food library, photo analysis, daily nutrition dashboard, alerts, and health profile.
- Preserve working authentication, data, photo review, logging, alert-read actions, profile editing, and saved full/reduced motion preference.
- The user reviewed the working app preview and authorized deployment of that redesign on 2026-11-27. The alternative direction sketches were not selected.
- Preview content is synthetic; no fabricated commercial, clinical, or accuracy claims.

## Brand Commitments

- NutriScan name and existing leaf logo.
- Food-related theme throughout, with the login and inner app matching.
- User references: Unlumen UI, Magic UI, and Smooth UI. Use their free component approaches and preserve attribution where required.
- The user selected a simple centered login card over a split photo layout.
- Use the app logo for automatic welcome animations, before sign-in and between successful sign-in and the dashboard. No Play or Skip buttons.
- User chose full motion in NutriScan; preserve the app's explicit motion setting.
- Current forest-green palette is established in code and prior screenshots; exact future colour values are a design decision.

## Evidence on Hand

Existing production application, repository, user screenshots, `client/src/assets/meal-bowl.webp`, and the three linked UI references. Demonstration data in the local preview is labelled synthetic in the preview documentation.

## Product Principles

- Make logging and understanding nutrition equally findable.
- Keep estimates reviewable before food is saved.
- Make the same product work on phone and desktop.
- Keep the food identity consistent across authentication and the workspace.

## Open Decisions

Specific audience demographics, medical positioning, and a standing workflow for future marketing pages have not been established.
