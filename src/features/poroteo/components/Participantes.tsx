import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField } from '@/components/ui/Fields';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { SectionHeader } from '@/components/ui/Typography';
import { ApiError, errorMessage } from '@/api/client';
import { useMiembros, useMutarMiembro, type AccionMiembro } from '../queries';
import type { PoroteoDetalle, RolPoroteo } from '@/types';
import styles from './Participantes.module.css';

export function Participantes({
  poroteo,
  bloqueado,
  onCambio,
}: {
  poroteo: PoroteoDetalle;
  bloqueado: boolean;
  onCambio: (p: PoroteoDetalle) => void;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<RolPoroteo>('colaborador');
  const miembros = useMiembros(poroteo.id, poroteo.permisos.administrarMiembros);
  const mutar = useMutarMiembro(poroteo.id);
  const conflicto = mutar.error instanceof ApiError && mutar.error.code === 'VERSION_CONFLICT';
  const disabled = bloqueado || mutar.isPending || conflicto;
  const actuar = (accion: AccionMiembro) =>
    mutar.mutate(accion, {
      onSuccess: (data) => {
        if ('salido' in data) navigate('/poroteos', { replace: true });
        else {
          onCambio(data);
          setEmail('');
        }
      },
    });
  return (
    <section className={styles.section} aria-label="Participantes">
      <SectionHeader titulo="Participantes" />
      {bloqueado && (
        <p>Guardá tus cambios o recargá el poroteo antes de administrar participantes.</p>
      )}
      {poroteo.permisos.administrarMiembros && (
        <>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              actuar({ accion: 'agregar', email, rol, version: poroteo.version });
            }}
          >
            <TextField
              label="Email de cuenta registrada"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
            />
            <SelectField
              label="Rol del nuevo participante"
              value={rol}
              onChange={(e) => setRol(e.target.value as RolPoroteo)}
              disabled={disabled}
            >
              <option value="colaborador">Colaborador</option>
              <option value="dueno">Dueño</option>
            </SelectField>
            <Button type="submit" disabled={disabled}>
              Agregar participante
            </Button>
          </form>
          {miembros.data && String(miembros.data.version) !== String(poroteo.version) && (
            <p role="status">
              Los participantes cambiaron. Revisá tu edición y recargá desde el servidor para
              continuar.
            </p>
          )}
          {miembros.isError ? (
            <ErrorState error={miembros.error} onRetry={() => miembros.refetch()} />
          ) : miembros.isPending ? (
            <Skeleton height={100} />
          ) : (
            <ul className={styles.list}>
              {miembros.data.miembros.map((m) => (
                <li key={m.userId} className={styles.member}>
                  <span className={styles.email}>{m.email ?? 'Cuenta registrada'}</span>
                  <SelectField
                    label={`Rol de ${m.email ?? m.userId}`}
                    value={m.rol}
                    disabled={disabled || String(miembros.data.version) !== String(poroteo.version)}
                    onChange={(e) => {
                      const nuevo = e.target.value as RolPoroteo;
                      if (window.confirm(`¿Cambiar el rol de ${m.email ?? 'esta cuenta'}?`))
                        actuar({
                          accion: 'rol',
                          userId: m.userId,
                          rol: nuevo,
                          version: poroteo.version,
                        });
                    }}
                  >
                    <option value="dueno">Dueño</option>
                    <option value="colaborador">Colaborador</option>
                  </SelectField>
                  <Button
                    variant="danger"
                    disabled={disabled || String(miembros.data.version) !== String(poroteo.version)}
                    onClick={() => {
                      if (window.confirm(`¿Quitar a ${m.email ?? 'esta cuenta'} del poroteo?`))
                        actuar({ accion: 'quitar', userId: m.userId, version: poroteo.version });
                    }}
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {poroteo.permisos.salir && (
        <Button
          disabled={disabled}
          onClick={() => {
            if (
              window.confirm(
                '¿Salir de este poroteo? Vas a perder el acceso de edición. Debe quedar otro dueño.',
              )
            )
              actuar({ accion: 'salir', version: poroteo.version });
          }}
        >
          Salir del poroteo
        </Button>
      )}
      {mutar.isError && <p role="alert">{errorMessage(mutar.error)}</p>}
    </section>
  );
}
