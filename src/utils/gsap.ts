import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

/**
 * Punto único de entrada a GSAP: registra los plugins una sola vez.
 * Importar siempre desde acá (`@/utils/gsap`), nunca de 'gsap' directo.
 * En React, animar solo dentro de `useGSAP` con `scope` (limpia todo al desmontar).
 */
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };
