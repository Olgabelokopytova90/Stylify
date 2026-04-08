type AvatarPromptInput = {
  genderPresentation: string;
  bodyShape: string;
  heightBucket: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  stylePreferences: string[];
};

export function buildAvatarPrompt(input: AvatarPromptInput) {
  const stylePrefs = input.stylePreferences.join(", ");

return `
Generate a full-body front-facing female avatar for a virtual try-on application.

The avatar must be centered, symmetrical, standing straight, arms relaxed close to the body, legs straight, feet fully visible, full body visible from head to toes.

Use a clean white background.
Use a realistic polished computer-generated look.
Keep the same camera angle, same pose, same framing, and same proportions.
No dramatic lighting, no props, no background scene, no side angle, no cropped body.

Clothing requirements:
- wear a simple fitted neutral athletic outfit
- fitted sleeveless top
- fitted shorts
- plain beige or light taupe color
- no jacket
- no jeans
- no skirt
- no shoes
- no accessories
- no jewelry

The purpose is clothing overlay alignment, so the body silhouette should remain clearly visible.

Character profile:
- gender presentation: ${input.genderPresentation}
- body shape: ${input.bodyShape}
- height category: ${input.heightBucket}
- skin tone: ${input.skinTone}
- hair style: ${input.hairStyle}
- hair color: ${input.hairColor}

Output requirements:
- one single avatar
- front-facing
- full body
- realistic computer-generated look
`.trim();
}