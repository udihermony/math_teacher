/**
 * Local Manim animation renderer.
 *
 * Prerequisites:
 *   - Python 3 with Manim Community Edition installed
 *   - pip install manim
 *
 * Usage:
 *   npx tsx scripts/render-animation.ts <scene-file.py> <SceneName> [output-dir]
 *
 * Example:
 *   npx tsx scripts/render-animation.ts scripts/manim-scenes/fractions.py FractionAddition public/animations
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { resolve, basename } from "path";

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: npx tsx scripts/render-animation.ts <scene-file.py> <SceneName> [output-dir]");
  console.error("");
  console.error("Example:");
  console.error("  npx tsx scripts/render-animation.ts scripts/manim-scenes/fractions.py FractionAddition public/animations");
  process.exit(1);
}

const sceneFile = resolve(args[0]);
const sceneName = args[1];
const outputDir = resolve(args[2] ?? "public/animations");

if (!existsSync(sceneFile)) {
  console.error(`Scene file not found: ${sceneFile}`);
  process.exit(1);
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputName = basename(sceneFile, ".py").toLowerCase();

console.log(`Rendering ${sceneName} from ${sceneFile}...`);

try {
  // Render at 720p quality (good balance of quality vs file size)
  execSync(
    `manim render -ql --format mp4 "${sceneFile}" ${sceneName} --media_dir /tmp/manim_media`,
    { stdio: "inherit" }
  );

  // Find the rendered file
  const mediaPath = `/tmp/manim_media/videos/${basename(sceneFile, ".py")}/480p15/${sceneName}.mp4`;

  if (existsSync(mediaPath)) {
    const destPath = resolve(outputDir, `${outputName}-${sceneName.toLowerCase()}.mp4`);
    execSync(`cp "${mediaPath}" "${destPath}"`);
    console.log(`\nRendered: ${destPath}`);
    console.log(`\nAdd to animation-library.ts:`);
    console.log(`{`);
    console.log(`  id: "${outputName}-${sceneName.toLowerCase()}",`);
    console.log(`  url: "/animations/${outputName}-${sceneName.toLowerCase()}.mp4",`);
    console.log(`  title: "${sceneName}",`);
    console.log(`  description: "...",`);
    console.log(`  concepts: ["..."],`);
    console.log(`  phase: ["FOUNDATIONS", "EXPLORER"],`);
    console.log(`},`);
  } else {
    console.error("Rendered file not found. Check Manim output above.");
  }
} catch (err) {
  console.error("Render failed. Make sure Manim is installed: pip install manim");
  process.exit(1);
}
