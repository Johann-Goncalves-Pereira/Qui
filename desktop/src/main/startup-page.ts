/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import type { ThemeSyncPayload } from './theme-cache.js'
import {
	MINIMAL_DARK_BACKGROUND,
	MINIMAL_LIGHT_BACKGROUND,
} from './window-material.js'

export const ANIMATED_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" width="56" height="56"><style>@keyframes pawStrideMorph{0%,100%{d:path("M231.4 291.6C294.4 223.4 533.9 250.8 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C636.3 206.3 583.8 199 439.8 191.1C372.3 174.5 383.6 46 453 40.1C763 64.2 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 788.6 507.6 788.6 507.6C729.2 659.6 651.9 722.2 507.8 738.1C445.6 724 415.6 700.1 448.6 633.1L489.2 626.6L528.7 636.9C558.1 626.7 562.4 621.2 553.4 603.3C532.3 605.6 527.4 606.6 510 604.5C498.1 657.2 493.2 678.4 443.8 710.8L451.5 739.9L552.2 783.9L637.8 848.4C650.8 924.1 590.1 947.2 558.1 949.3C457.1 875.9 394.8 844.9 259.8 831.7C233.8 833.5 229.1 827 230.5 803.2C234.7 669 192.1 587.1 169.7 549.2C157.6 578.3 105.8 647 45.5 575.8C-22 496.1 79.2 447.4 145.6 434.3C147.9 409.7 168.4 347.8 231.4 291.6Z")}20%{d:path("M231.4 300.1C294.4 257.4 533.9 276.3 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C634.6 211.5 580.9 219.7 439.8 253C370.3 254.5 347.9 127.4 413.5 103.8C739.4 53.2 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 789.9 501.2 789.9 501.2C797.4 606.3 798.1 654.5 759.5 765.4C726.9 820.2 695 841.4 641.5 789.3L621.5 741.1L626.3 707.9C610.5 669 594.5 649.1 568.3 621C542 610.4 520.8 614.6 499.9 627.3C436.4 721.3 380.1 763.7 298.6 765.4L282.3 796L314.1 904.9L323.4 1011.7C275.9 1072 218.1 1042.3 195.1 1020C182.1 895.8 165.3 829.2 81.9 725.4C61.7 710.2 62.4 703.9 78.9 689C181.4 625.2 183.2 567.2 168.5 541.8C119.2 567.6 33.8 597.7 17.2 505.8C-1.4 403.1 104.7 415.7 145.6 434.3C147.9 409.7 168.4 347.8 231.4 300.1Z")}46%{d:path("M231.4 303.1C294.4 269.4 533.9 285.3 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C634.1 213.3 581 226.6 443.4 273.4C374.3 280.9 340.9 156.2 404.2 127C731.3 50.3 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 790.3 496.9 790.3 496.9C812.6 571.8 826 601.1 841 708.1C840.2 771.9 823.1 806.2 750.7 787.8L696.4 751.8L675.9 715C636.2 676 609.6 654.8 575.3 625.5C546.5 610.9 518.3 614.1 496 630.2C410.6 722.7 330.9 759.3 241 741.6L210.6 770L185 886.6L146.5 986.6C77.4 1020 38.5 968 27.6 937.8C70.3 820.5 86.6 755 50.3 631C35.5 611.7 36.7 608.2 55.4 601.2C169.4 587.9 181.4 552.5 168.3 536.8C110 562 19.8 578.8 16.2 485.5C12 381.2 113.7 409.4 145.6 434.3C147.9 409.7 168.4 347.8 231.4 303.1Z")}70%{d:path("M231.4 298.6C294.4 251.4 533.9 271.8 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C635.3 209.1 581.7 209.9 437.8 224.2C368.7 217.1 361.9 88.2 429.9 72.8C750.6 57.9 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 790 507.7 790 507.7C790 658.9 775.2 735.1 684.1 830.3C628.5 861.5 590.2 863.8 569.9 791.9L580.5 748L600.6 721.6C598.5 678.8 586.7 655.1 564.9 623.7C539.7 613.3 523.1 607.2 503.5 614.2C459.7 682.5 421.5 696.3 348.7 699.9L347.1 715L444.6 741.8L530.1 806.3C543.2 881.9 482.4 905 450.5 907.1C349.5 833.8 281.8 806 142.1 773.2C114.4 764.8 110.1 751.6 117.7 723.6C196.5 620.4 185.5 565.9 168.7 541.8C128.9 572.1 50.4 614.4 21.1 525.8C-11.6 426.6 96.6 423 145.6 434.3C147.9 409.7 168.4 347.8 231.4 298.6Z")}86%{d:path("M231.4 294.1C294.4 233.4 533.9 258.3 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C636 207 583.1 201.7 438.9 199.3C370.8 185.1 377.6 56.2 446.8 48C759.9 62.6 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 788.9 508.4 788.9 508.4C743.4 664.7 681.1 734.3 545.1 772.3C481.4 769.3 447.6 751 468.6 679.3L505 661.6L542.2 661.7C565.9 641.8 567.2 630.8 555.7 608.9C533.8 607.3 526 606.3 507.9 607.2C486.5 664.4 469.9 681.5 411.5 704.9L415.6 726.5L517.3 750.8L609.2 806C630.1 879.9 572.1 909.2 540.5 914.6C432.4 852.2 364.5 829.9 224.9 820.9C197.3 820.2 191.5 810.7 193.1 784.1C220.9 653.3 189.5 580.1 169.2 546.8C149.6 577.5 89.5 640.3 37 563.2C-21.8 476.9 83.1 440.2 145.6 434.3C147.9 409.7 168.4 347.8 231.4 294.1Z")}}@keyframes logo-bounce{0%,100%{transform:translate(-20px,28px) rotate(5deg)}20%{transform:translate(-4px,12px) rotate(-12deg)}46%{transform:translate(32px,-62px) rotate(-2deg)}70%{transform:translate(18px,-14px) rotate(11deg)}86%{transform:translate(-12px,32px) rotate(7deg)}}@keyframes streakTopAnim{0%{transform:translate(55px,6px) scale(0.35,0.85);opacity:0}30%{opacity:1}85%{opacity:0.85}100%{transform:translate(-62px,-8px) scale(1.08,0.92);opacity:0}}@keyframes streakBottomAnim{0%{transform:translate(65px,8px) scale(0.35,0.85);opacity:0}30%{opacity:1}85%{opacity:0.85}100%{transform:translate(-54px,-6px) scale(1.12,0.92);opacity:0}}@keyframes shadowPulseAnim{0%,86%,100%{transform:translateX(-14px) scaleX(1.08);opacity:0.42}20%{transform:translateX(-4px) scaleX(0.92);opacity:0.32}46%{transform:translateX(28px) scaleX(0.48);opacity:0.12}}.rabbit-bound-group{transform-origin:540px 560px;animation:logo-bounce 0.85s cubic-bezier(0.42,0,0.58,1) infinite}.animated-logo-element{animation:pawStrideMorph 0.85s linear infinite}.speed-streak-top{transform-box:fill-box;transform-origin:right center;animation:streakTopAnim 0.60s cubic-bezier(0.22,0.61,0.36,1) infinite}.speed-streak-bottom{transform-box:fill-box;transform-origin:right center;animation:streakBottomAnim 0.60s cubic-bezier(0.22,0.61,0.36,1) infinite 0.14s}.ground-shadow-fx{transform-origin:520px 1005px;animation:shadowPulseAnim 0.85s cubic-bezier(0.42,0,0.58,1) infinite}@media(prefers-reduced-motion:reduce){.rabbit-bound-group,.animated-logo-element,.speed-streak-top,.speed-streak-bottom,.ground-shadow-fx{animation:none!important}}</style><g transform="translate(568, 530) scale(0.74) translate(-512, -512)"><ellipse class="ground-shadow-fx" cx="520" cy="1005" rx="260" ry="24" fill="color-mix(in srgb, var(--primary) 22%, transparent)"/><path class="speed-streak-bottom" d="M59.7358 258.506H141.432" stroke="color-mix(in srgb, var(--primary) 65%, transparent)" stroke-width="84" stroke-linecap="round"/><path class="speed-streak-top" d="M134.328 137.738H265.752" stroke="color-mix(in srgb, var(--primary) 65%, transparent)" stroke-width="84" stroke-linecap="round"/><g class="rabbit-bound-group"><path class="animated-logo-element" fill="color-mix(in srgb, var(--primary) 20%, transparent)" stroke="var(--primary)" stroke-linejoin="round" stroke-width="30" pathLength="3200" d="M231.4 291.6C294.4 223.4 533.9 250.8 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C636.3 206.3 583.8 199 439.8 191.1C372.3 174.5 383.6 46 453 40.1C763 64.2 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 788.6 507.6 788.6 507.6C729.2 659.6 651.9 722.2 507.8 738.1C445.6 724 415.6 700.1 448.6 633.1L489.2 626.6L528.7 636.9C558.1 626.7 562.4 621.2 553.4 603.3C532.3 605.6 527.4 606.6 510 604.5C498.1 657.2 493.2 678.4 443.8 710.8L451.5 739.9L552.2 783.9L637.8 848.4C650.8 924.1 590.1 947.2 558.1 949.3C457.1 875.9 394.8 844.9 259.8 831.7C233.8 833.5 229.1 827 230.5 803.2C234.7 669 192.1 587.1 169.7 549.2C157.6 578.3 105.8 647 45.5 575.8C-22 496.1 79.2 447.4 145.6 434.3C147.9 409.7 168.4 347.8 231.4 291.6Z"><animate attributeName="d" values="M231.4 291.6C294.4 223.4 533.9 250.8 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C636.3 206.3 583.8 199 439.8 191.1C372.3 174.5 383.6 46 453 40.1C763 64.2 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 788.6 507.6 788.6 507.6C729.2 659.6 651.9 722.2 507.8 738.1C445.6 724 415.6 700.1 448.6 633.1L489.2 626.6L528.7 636.9C558.1 626.7 562.4 621.2 553.4 603.3C532.3 605.6 527.4 606.6 510 604.5C498.1 657.2 493.2 678.4 443.8 710.8L451.5 739.9L552.2 783.9L637.8 848.4C650.8 924.1 590.1 947.2 558.1 949.3C457.1 875.9 394.8 844.9 259.8 831.7C233.8 833.5 229.1 827 230.5 803.2C234.7 669 192.1 587.1 169.7 549.2C157.6 578.3 105.8 647 45.5 575.8C-22 496.1 79.2 447.4 145.6 434.3C147.9 409.7 168.4 347.8 231.4 291.6Z;M231.4 300.1C294.4 257.4 533.9 276.3 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C634.6 211.5 580.9 219.7 439.8 253C370.3 254.5 347.9 127.4 413.5 103.8C739.4 53.2 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 789.9 501.2 789.9 501.2C797.4 606.3 798.1 654.5 759.5 765.4C726.9 820.2 695 841.4 641.5 789.3L621.5 741.1L626.3 707.9C610.5 669 594.5 649.1 568.3 621C542 610.4 520.8 614.6 499.9 627.3C436.4 721.3 380.1 763.7 298.6 765.4L282.3 796L314.1 904.9L323.4 1011.7C275.9 1072 218.1 1042.3 195.1 1020C182.1 895.8 165.3 829.2 81.9 725.4C61.7 710.2 62.4 703.9 78.9 689C181.4 625.2 183.2 567.2 168.5 541.8C119.2 567.6 33.8 597.7 17.2 505.8C-1.4 403.1 104.7 415.7 145.6 434.3C147.9 409.7 168.4 347.8 231.4 300.1Z;M231.4 303.1C294.4 269.4 533.9 285.3 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C634.1 213.3 581 226.6 443.4 273.4C374.3 280.9 340.9 156.2 404.2 127C731.3 50.3 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 790.3 496.9 790.3 496.9C812.6 571.8 826 601.1 841 708.1C840.2 771.9 823.1 806.2 750.7 787.8L696.4 751.8L675.9 715C636.2 676 609.6 654.8 575.3 625.5C546.5 610.9 518.3 614.1 496 630.2C410.6 722.7 330.9 759.3 241 741.6L210.6 770L185 886.6L146.5 986.6C77.4 1020 38.5 968 27.6 937.8C70.3 820.5 86.6 755 50.3 631C35.5 611.7 36.7 608.2 55.4 601.2C169.4 587.9 181.4 552.5 168.3 536.8C110 562 19.8 578.8 16.2 485.5C12 381.2 113.7 409.4 145.6 434.3C147.9 409.7 168.4 347.8 231.4 303.1Z;M231.4 298.6C294.4 251.4 533.9 271.8 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C635.3 209.1 581.7 209.9 437.8 224.2C368.7 217.1 361.9 88.2 429.9 72.8C750.6 57.9 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 790 507.7 790 507.7C790 658.9 775.2 735.1 684.1 830.3C628.5 861.5 590.2 863.8 569.9 791.9L580.5 748L600.6 721.6C598.5 678.8 586.7 655.1 564.9 623.7C539.7 613.3 523.1 607.2 503.5 614.2C459.7 682.5 421.5 696.3 348.7 699.9L347.1 715L444.6 741.8L530.1 806.3C543.2 881.9 482.4 905 450.5 907.1C349.5 833.8 281.8 806 142.1 773.2C114.4 764.8 110.1 751.6 117.7 723.6C196.5 620.4 185.5 565.9 168.7 541.8C128.9 572.1 50.4 614.4 21.1 525.8C-11.6 426.6 96.6 423 145.6 434.3C147.9 409.7 168.4 347.8 231.4 298.6Z;M231.4 294.1C294.4 233.4 533.9 258.3 645.8 285.7C652.7 261 660.1 247.1 681.9 221.8C636 207 583.1 201.7 438.9 199.3C370.8 185.1 377.6 56.2 446.8 48C759.9 62.6 976.7 208.2 996.3 297.6C1015.8 387 1005.8 360.5 996.3 397.6C973.2 454.9 910.4 501.8 891.5 508.3C872.5 514.8 788.9 508.4 788.9 508.4C743.4 664.7 681.1 734.3 545.1 772.3C481.4 769.3 447.6 751 468.6 679.3L505 661.6L542.2 661.7C565.9 641.8 567.2 630.8 555.7 608.9C533.8 607.3 526 606.3 507.9 607.2C486.5 664.4 469.9 681.5 411.5 704.9L415.6 726.5L517.3 750.8L609.2 806C630.1 879.9 572.1 909.2 540.5 914.6C432.4 852.2 364.5 829.9 224.9 820.9C197.3 820.2 191.5 810.7 193.1 784.1C220.9 653.3 189.5 580.1 169.2 546.8C149.6 577.5 89.5 640.3 37 563.2C-21.8 476.9 83.1 440.2 145.6 434.3C147.9 409.7 168.4 347.8 231.4 291.6Z" keyTimes="0;0.20;0.46;0.70;0.86;1" dur="0.85s" repeatCount="indefinite"/></path><path d="M875.512 351.45C900.687 351.45 921.096 331.042 921.096 305.866C921.096 280.691 900.687 260.282 875.512 260.282C850.336 260.282 829.928 280.691 829.928 305.866C829.928 331.042 850.336 351.45 875.512 351.45Z" fill="var(--primary)"/></g></g></svg>`

/** Backwards-compatible alias for existing callers. */
export const LOADING_SPINNER_SVG = ANIMATED_LOGO_SVG

export const DEFAULT_DARK_VARS: Record<string, string> = {
	'--background': MINIMAL_DARK_BACKGROUND,
	'--foreground': '#f0f6fc',
	'--card': 'rgba(22, 27, 34, 0.92)',
	'--card-foreground': '#f0f6fc',
	'--primary': '#a5d6ff',
	'--border': 'rgba(255, 255, 255, 0.14)',
	'--muted': 'rgba(13, 17, 23, 0.85)',
	'--muted-foreground': '#c9d1d9',
	'--radius': '10px',
}

export const DEFAULT_LIGHT_VARS: Record<string, string> = {
	'--background': MINIMAL_LIGHT_BACKGROUND,
	'--foreground': '#1f2328',
	'--card': 'rgba(255, 255, 255, 0.96)',
	'--card-foreground': '#1f2328',
	'--primary': '#0969da',
	'--border': 'rgba(31, 35, 40, 0.15)',
	'--muted': 'rgba(246, 248, 250, 0.9)',
	'--muted-foreground': '#656d76',
	'--radius': '10px',
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
}

function cssVarsToStyleBlock(vars: Record<string, string>): string {
	return Object.entries(vars)
		.map(([key, val]) => `${key}:${val};`)
		.join('')
}

export function startupPageDocument(
	message: string,
	processInfo: string,
	prefersDark: boolean,
	cachedTheme?: ThemeSyncPayload | null,
): string {
	const effectiveDark =
		cachedTheme?.isDark !== undefined ? cachedTheme.isDark : prefersDark
	const defaultVars = effectiveDark ? DEFAULT_DARK_VARS : DEFAULT_LIGHT_VARS
	const themeVars = effectiveDark
		? cachedTheme?.cssVars?.dark
		: cachedTheme?.cssVars?.light
	const effectiveVars: Record<string, string> = {
		...defaultVars,
		...(themeVars ?? {}),
	}

	const background =
		effectiveVars['--background'] ||
		(effectiveDark ? MINIMAL_DARK_BACKGROUND : MINIMAL_LIGHT_BACKGROUND)
	const safeMessage = escapeHtml(message)
	const safeProcess = escapeHtml(processInfo)
	const rootVars = cssVarsToStyleBlock(effectiveVars)
	const rawCss = cachedTheme?.rawCss
		? `<style>${cachedTheme.rawCss}</style>`
		: ''
	const htmlClass = effectiveDark ? ' class="dark"' : ''

	return `<!DOCTYPE html><html${htmlClass}><head><meta charset="utf-8"><style>
:root{${rootVars}}
html,body{margin:0;height:100%;background:${background};color:var(--foreground);font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased}
.card{background:var(--card);color:var(--card-foreground);border:1px solid var(--border);border-radius:calc(var(--radius, 10px) * 1.5);padding:32px 36px;text-align:center;max-width:440px;box-shadow:0 20px 40px rgba(0,0,0,.45)}
.spinner{display:flex;align-items:center;justify-content:center;margin-bottom:16px}
h1{font-size:24px;margin:0 0 10px;font-weight:650;letter-spacing:-0.02em;color:var(--card-foreground)}
p{margin:0;color:var(--muted-foreground);font-size:14px;line-height:1.5}
.process-code{margin:16px 0 0;padding:10px 14px;background:var(--muted);border:1px solid var(--border);border-radius:var(--radius, 10px);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:var(--card-foreground);text-align:left;overflow-x:auto;max-height:120px;white-space:pre-wrap;word-break:break-all}
</style>${rawCss}</head><body><div class="card"><div class="spinner">${ANIMATED_LOGO_SVG}</div><h1>Qui</h1><p>${safeMessage}</p><pre class="process-code"><code>${safeProcess}</code></pre></div></body></html>`
}

export function startupPageUrl(
	message: string,
	processInfo: string,
	prefersDark: boolean,
	cachedTheme?: ThemeSyncPayload | null,
): string {
	return `data:text/html;charset=utf-8,${encodeURIComponent(
		startupPageDocument(message, processInfo, prefersDark, cachedTheme),
	)}`
}
