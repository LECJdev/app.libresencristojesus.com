import Image from 'next/image';

type BrandLogoVariant = 'horizontal' | 'vertical' | 'mark';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
}

const logoConfig: Record<BrandLogoVariant, { src: string; alt: string; width: number; height: number }> = {
  horizontal: {
    src: '/identidad/Logos-Nombre.png',
    alt: 'Libres en Cristo Jesús',
    width: 720,
    height: 210,
  },
  vertical: {
    src: '/identidad/logo-color-vertical.png',
    alt: 'Libres en Cristo Jesús',
    width: 520,
    height: 640,
  },
  mark: {
    src: '/identidad/Logos-Amarillo,azul.png',
    alt: 'Libres en Cristo Jesús',
    width: 220,
    height: 220,
  },
};

export default function BrandLogo({
  variant = 'horizontal',
  className = '',
  priority = false,
}: BrandLogoProps) {
  const logo = logoConfig[variant];

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      priority={priority}
      className={className}
    />
  );
}
