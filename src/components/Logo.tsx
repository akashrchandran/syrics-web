const Logo = () => {
  return (
    <div className="flex items-center gap-1">
      <img
        src="/syrics96.png"
        alt="Syrics Logo"
        className="h-12 w-auto md:h-16"
      />
      <span className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
        yrics
      </span>
    </div>
  );
};

export default Logo;
