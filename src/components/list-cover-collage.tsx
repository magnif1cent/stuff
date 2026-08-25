import Image from "next/image";
import { resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";
import { YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";
import type { ListCoverTile } from "@/lib/lists";

// A Spotify-playlist-style cover for a browse card: up to 4 poster/thumbnail
// tiles standing in for the list's own contents instead of plain text. Tile
// count drives the layout rather than always rendering a fixed 2x2 grid, so
// a 1- or 2-item list doesn't read as "mostly empty."
function gridClasses(count: number) {
  if (count <= 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  return "grid-cols-2 grid-rows-2";
}

function CoverTileImage({ tile }: { tile: ListCoverTile }) {
  if (tile.kind === "FIGHT_SCENE") {
    return <YoutubeThumbnailImage videoId={tile.youtubeVideoId} title={tile.title} textClassName="text-[8px]" />;
  }

  const posterUrl = resolvePosterUrl(tile, "w200");
  if (!posterUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-800 px-1 text-center text-[9px] text-neutral-500">
        {tile.title}
      </div>
    );
  }
  return (
    <Image
      src={posterUrl}
      alt=""
      fill
      unoptimized={isTmdbUrl(posterUrl)}
      sizes="200px"
      className="object-cover"
    />
  );
}

export function ListCoverCollage({ tiles, listName }: { tiles: ListCoverTile[]; listName: string }) {
  if (tiles.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-neutral-800 px-3 text-center text-xs text-neutral-600">
        {listName}
      </div>
    );
  }

  return (
    <div className={`grid aspect-square w-full gap-0.5 bg-neutral-950 ${gridClasses(tiles.length)}`}>
      {tiles.map((tile, i) => (
        <div key={i} className="relative overflow-hidden bg-neutral-800">
          <CoverTileImage tile={tile} />
        </div>
      ))}
    </div>
  );
}
