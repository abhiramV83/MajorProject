# Theme validation report

Matrix: 18 routes × 2 themes × 4 viewports × 4 roles × 4 states.
Elements checked: dark 1339, light 1339.
Failures: 13; warnings: 0.

| Route | Theme | Elements | Failures | Warnings |
|---|---|---:|---:|---:|
| /login | dark | 42 | 0 | 0 |
| / | dark | 95 | 0 | 0 |
| /participants | dark | 116 | 0 | 0 |
| /dashboard | dark | 149 | 0 | 0 |
| /login | light | 42 | 0 | 0 |
| / | light | 95 | 0 | 0 |
| /participants | light | 116 | 0 | 0 |
| /dashboard | light | 149 | 0 | 0 |
| /participants/new | dark | 58 | 0 | 0 |
| /participants/1/edit | dark | 58 | 0 | 0 |
| /assessments | dark | 69 | 0 | 0 |
| /participants/1 | dark | 99 | 0 | 0 |
| /participants/new | light | 58 | 0 | 0 |
| /participants/1/edit | light | 58 | 0 | 0 |
| /assessments | light | 69 | 0 | 0 |
| /participants/1 | light | 99 | 0 | 0 |
| /assessments/new | dark | 16 | 0 | 0 |
| /interventions | dark | 58 | 0 | 0 |
| /assessments/1 | dark | 164 | 0 | 0 |
| /model-performance | dark | 145 | 0 | 0 |
| /assessments/new | light | 16 | 0 | 0 |
| /interventions | light | 58 | 0 | 0 |
| /model-performance | light | 145 | 0 | 0 |
| /assessments/1 | light | 164 | 12 | 0 |
| /fairness | dark | 75 | 0 | 0 |
| /model-card | dark | 53 | 0 | 0 |
| /not-a-route | dark | 10 | 0 | 0 |
| /audit-logs | dark | 48 | 0 | 0 |
| /fairness | light | 75 | 0 | 0 |
| /not-a-route | light | 10 | 0 | 0 |
| /model-card | light | 53 | 0 | 0 |
| /audit-logs | light | 48 | 0 | 0 |
| /dashboard?qa=unauthorized | dark | 42 | 0 | 0 |
| /dashboard?qa=session-expired | dark | 42 | 0 | 0 |
| /dashboard?qa=unauthorized | light | 42 | 0 | 0 |
| /dashboard?qa=session-expired | light | 42 | 0 | 0 |
| SOURCE_CHANGED | both | 0 | 1 | 0 |

| Route | Viewport | Role | Theme | State | Selector | Text | Foreground | Background | Ratio | Required | Severity |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| /assessments/1 | 375x812 | JUDGE | light | data | [data-theme-qa-id="243"] |  | rgb(52, 211, 153) | rgb(255,255,255) | 1.92 | 3 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | [data-theme-qa-id="246"] |  | rgb(52, 211, 153) | rgb(255,255,255) | 1.92 | 3 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | [data-theme-qa-id="249"] |  | rgb(52, 211, 153) | rgb(255,255,255) | 1.92 | 3 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | [data-theme-qa-id="252"] |  | rgb(52, 211, 153) | rgb(255,255,255) | 1.92 | 3 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | [data-theme-qa-id="255"] |  | rgb(251, 113, 133) | rgb(255,255,255) | 2.69 | 3 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | [data-theme-qa-id="258"] |  | rgb(251, 113, 133) | rgb(255,255,255) | 2.69 | 3 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | .p-2\.5.bg-bg-base\/40.rounded-xl:nth-child(1) > .text-right.shrink-0 > .text-\[11px\].text-emerald-400.font-mono | <span class="font-mono font-bold text-[1 | #00d492 | #feffff | 1.93 | 4.5 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | .p-2\.5.bg-bg-base\/40.rounded-xl:nth-child(2) > .text-right.shrink-0 > .text-\[11px\].text-emerald-400.font-mono | <span class="font-mono font-bold text-[1 | #00d492 | #feffff | 1.93 | 4.5 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | .p-2\.5.bg-bg-base\/40.rounded-xl:nth-child(3) > .text-right.shrink-0 > .text-\[11px\].text-emerald-400.font-mono | <span class="font-mono font-bold text-[1 | #00d492 | #feffff | 1.93 | 4.5 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | .p-2\.5.bg-bg-base\/40.rounded-xl:nth-child(4) > .text-right.shrink-0 > .text-\[11px\].text-emerald-400.font-mono | <span class="font-mono font-bold text-[1 | #00d492 | #feffff | 1.93 | 4.5 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | .text-amber-400.text-sm.font-mono | <span class="text-amber-400 font-mono te | #ffb900 | #feffff | 1.71 | 4.5 | FAIL |
| /assessments/1 | 375x812 | JUDGE | light | data | .bg-emerald-500\/20 | <button type="button" class="px-3.5 py-1 | #00d492 | #cbf2e5 | 1.60 | 4.5 | FAIL |
| SOURCE_CHANGED | all | all | both | run | src/** | Source files changed during run |  |  | 0.00 | 1 | FAIL |