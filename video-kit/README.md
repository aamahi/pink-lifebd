# Pink Life ad: model clips

The example ads (`public/videos/ex-adverticse-vide.mp4`, `example-video2.mp4`) open with a woman
wearing the product, cropped from the chin down, in short close-up shots. Then a typed web address,
then a full-screen scroll of the website. This folder is how we get the first part.

I (Claude) cannot generate people or video. You make the clips with an AI video tool (Kling, Runway,
Veo, Hailuo, etc.). I do the rest: typed address, website scroll, Bangla voice, end card, final export.

## What the ad will say at the end (already built)

- "অর্ডার করতে ভিজিট করুন" + **pinklife.com.bd**
- "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি" (Cash on Delivery all over Bangladesh)
- fb/pinklife
- No WhatsApp, no Messenger.

## Steps

1. For each shot below, open the matching picture in `product-refs/` (clean product photo, no
   marketplace strip).
2. **Make the model picture.** Give the tool the product photo as the reference/start image and paste
   the **Picture prompt**. Use the tool's "reference image", "subject reference" or "virtual try-on"
   mode, so the garment keeps its exact colour, lace and straps. Check the garment against the
   product photo; reject pictures where it changed.
3. **Animate it.** Use the picture as the start frame and paste the **Motion prompt**. Ask for
   **5 seconds, 9:16 vertical, 720p or 1080p**. No sound needed.
4. Save as `clips/shot-1.mp4`, `clips/shot-2.mp4`, ... (keep the numbers).
5. Tell Claude the clips are ready.

Keep the **same woman** in every shot: generate shot 1 first, then use her as the character reference
for the others. Same hair, skin tone, warm beige curtain background.

## Style (put this in every picture prompt)

> Photo of a South Asian (Bangladeshi) woman with long dark wavy hair, wearing the garment from the
> reference photo exactly as shown (same colour, lace pattern, straps, stitching). Vertical 9:16.
> Cropped at the chin, her face is not visible. Warm soft studio light, beige/taupe curtain
> background, natural skin, realistic fabric. No text, no logo, no watermark.

## Shots

| # | Reference photo | Picture prompt (after the Style paragraph) | Motion prompt |
|---|---|---|---|
| 1 | `1-candy-bra-baby-pink.jpg` | Front view, chest to waist, one hand lightly touching her hair. | Slow push-in. She tilts her head slightly and tucks her hair behind her ear. Soft breathing. |
| 2 | `2-chikan-cotton-bra-beige.jpg` | Front view, chest to waist, arms relaxed. Show the chikan embroidery clearly. | Slow handheld drift left to right. She shifts her weight gently. |
| 3 | `3-lacy-wired-bra-beige-BACK.jpg` and `3-lacy-wired-bra-beige-FRONT.jpg` | Back view, neck to waist, hair over one shoulder, strap and hook band visible. | She turns her head and shoulder slightly. Hair moves. Camera moves slowly down the strap. |
| 4 | `4-comfy-wireless-bra-wine.jpg` | Front view, close-up on the cups and straps, wine/maroon bra. | Her fingers adjust the strap, then settle. Slow push-in. |
| 5 | `5-lovebirds-bra-and-panty-set-pink.jpg` | Three-quarter view from chest to hips, matching pink lace bra and panty. | She turns a quarter turn, hands on her waist. The lace catches the light. |
| 6 | `6-satin-nightwear-set-rose-red.jpg` | Neck to mid-thigh, rose-red satin cami and shorts. | She turns slowly. The satin ripples and shines. Slow camera orbit. |
| 7 | `7-lace-babydoll-black.jpg` | Neck to hips, black lace babydoll. | She turns a quarter turn. The sheer lace sways. |

Shots 1 to 3 matter most; 4 to 7 are optional extras. Claude picks the best ones.

## If the tool changes the product

Common failures: wrong colour, plain fabric instead of lace, extra straps, a logo on the band. Re-run
with "keep the garment identical to the reference" and compare against the photo in `product-refs/`.
A clip that shows the wrong product misleads customers, so reject it.

## Note on AI models

Meta (Facebook/Instagram) may require an "AI-generated" label on ads that use AI-made people.
Check the platform's current rules before running this as a paid ad.
