export const Hero = () => {
  return (
    <section className="relative w-full py-24 flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 uppercase">
        Kitwer <span className="text-cyan-500">2026</span>
      </h1>
      <p className="text-xl text-th-subtle max-w-2xl mb-10">
        Hardware ad alte prestazioni, simulazione professionale e setup estremi.
        Curati per chi non accetta compromessi.
      </p>
      <button
        onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}
        className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 px-10 rounded-lg transition-all"
      >
        ESPLORA IL SETUP
      </button>
    </section>
  );
};
