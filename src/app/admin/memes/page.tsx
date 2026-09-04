import { AdminMemeGenerator } from "@/components/admin-meme-generator";

export default function AdminMemesPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Meme generator</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Caption an image sourced from a fight scene&rsquo;s linked video, or drop in your own screenshot. Generated
        images are composited in your browser and downloaded directly &mdash; nothing is saved or shared from here.
      </p>
      <AdminMemeGenerator />
    </div>
  );
}
