import type { TmdbImage } from "@/lib/tmdb";

// Shared by the poster and backdrop "options" routes: trims TMDB's raw image
// list down to the highest-voted ones and drops fields the picker UI doesn't
// need (language, aspect ratio, vote score itself).
export function selectTopImages(images: TmdbImage[], max: number) {
  return [...images]
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, max)
    .map((image) => ({ filePath: image.file_path, width: image.width, height: image.height }));
}
