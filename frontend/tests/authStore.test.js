import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';

describe('Auth & Modular Store (Frontend)', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('M0 siempre permanece activo incluso sin módulos cargados', () => {
    const auth = useAuthStore();
    expect(auth.isModuleActive('M0')).toBe(true);
  });

  it('Respetar activación y desactivación dinámica de módulos (M6 Vivero)', () => {
    const auth = useAuthStore();
    auth.modulos = [
      { codigo: 'M0', nombre: 'Núcleo', activo: true },
      { codigo: 'M6', nombre: 'Vivero', activo: false }
    ];
    expect(auth.isModuleActive('M0')).toBe(true);
    expect(auth.isModuleActive('M6')).toBe(false);
  });

  it('Evalúa roles correctamente para permisos de UI', () => {
    const auth = useAuthStore();
    auth.usuario = { nombre: 'Elena', rol: 'PROPIETARIO' };
    expect(auth.isPropietario).toBe(true);
    expect(auth.isEncargadoOrAbove).toBe(true);

    auth.usuario = { nombre: 'Mateo', rol: 'TRABAJADOR' };
    expect(auth.isPropietario).toBe(false);
    expect(auth.isEncargadoOrAbove).toBe(false);
  });
});
