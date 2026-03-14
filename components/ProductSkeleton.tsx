export const ProductSkeleton = () => {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 animate-pulse">
      {/* Immagine Placeholder */}
      <div className="bg-white/10 aspect-square rounded-lg mb-4" />

      {/* Titolo Placeholder */}
      <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />

      {/* Prezzo Placeholder */}
      <div className="h-6 bg-cyan-500/20 rounded w-1/4 mb-4" />

      {/* Bottoni Placeholder */}
      <div className="flex gap-2">
        <div className="h-10 bg-white/5 rounded-lg flex-1" />
        <div className="h-10 bg-white/5 rounded-lg flex-1" />
      </div>
    </div>
  );
};
