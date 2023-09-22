import './App.css';
import { Checkbox, FormGroup, FormControlLabel, FormLabel, Grid, Paper, Box, Typography } from '@mui/material';
import materias_plan86 from "./plan_86.json";
import plan23 from "./plan_23.json";
import { useCallback, useEffect, useState } from 'react';
import { useMaterias86 } from './utils/useMaterias86';
import Materia86 from './components/Materia86';
import Materia23 from './components/Materia23';
import ShareDialog from './components/ShareDialog';
import ExtraCredits from './components/ExtraCredits';
import Header from './components/Header/Header';
import { useExtraCredits } from './utils/useExtraCredits';
import { useCanje } from './utils/useCanje';
import Canje from './components/Canje';


const { creditosElectivas: CREDITOS_ELECTIVAS_23, materias: MATERIAS_PLAN_23 } = plan23;
const MIN_CREDITOS_CANJE = MATERIAS_PLAN_23.map(materia => materia.canjeable ?? 99).reduce((a, b) => Math.min(a, b))

function App() {
  const [creditos, setCreditos] = useState(0);
  const [creditosDirectos, setCreditosDirectos] = useState(0);
  const [creditosTransicion, setCreditosTransicion] = useState(0);
  const [creditosCanje, setCreditosCanje] = useState(0);
  const [creditosExtra, setCreditosExtra] = useExtraCredits("xcredits", 0);
  const [materias86, setMaterias86, readOnly] = useMaterias86("materias86-calculadorBilbao2", []);
  const [materias23, setMaterias23] = useState([]);
  const [materiasCanjeadas, setMateriasCanjeadas] = useCanje("canje", []);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [canjeShareCode, setCanjeShareCode] = useState("");

  const agregarMateria86 = useCallback((materia) => {
    setMaterias86(materias =>
      materias.includes(materia) ? materias : materias.concat(materia)
    );
  }, [setMaterias86]);

  const agregarMaterias86 = useCallback((materias) => {
    const filtradas = materias.filter(materia => !materias86.map(m => m.nombre).includes(materia.nombre));
    if (filtradas.length === 0) return;

    setMaterias86(materias86.concat(filtradas));
  }, [materias86, setMaterias86]);

  const seleccionarTodasObligatorias86 = () => {
    agregarMaterias86(materias_plan86.obligatorias);
  };

  const limpiarTodo = () => {
    setMaterias86([]);
    setCreditosDirectos(0);
    setCreditosTransicion(0);
    setCreditos(0);
    setMaterias23([]);
    setCreditosExtra(0);
  };

  const eliminarMateria86 = useCallback((materia) => {
    setMaterias86(materias => materias.filter(m => m.nombre !== materia.nombre));
  }, [setMaterias86]);

  const compartir = () => {
    let bits = "";
    let hexa = "";

    materias_plan86.obligatorias.forEach(materia => {
      bits += (materias86.some(m => m.nombre === materia.nombre)) ? "1" : "0";
    });

    materias_plan86.orientaciones.forEach(orientacion => {
      orientacion.materias.forEach(materia => {
        bits += (materias86.some(m => m.nombre === materia.nombre)) ? "1" : "0";
      });
    });

    materias_plan86.electivas.forEach(materia => {
      bits += (materias86.some(m => m.nombre === materia.nombre)) ? "1" : "0";
    });

    for (let i = 0; i < bits.length; i += 4) {
      hexa += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }

    setShareCode(hexa);

    bits = "";
    hexa = "";

    MATERIAS_PLAN_23.forEach(materia => {
      bits += (materiasCanjeadas.some(m => m === materia.nombre)) ? "1" : "0";
    });

    for (let i = 0; i < bits.length; i += 4) {
      hexa += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }

    setCanjeShareCode(hexa);
    setShareDialogOpen(true);
  }

  useEffect(() => {
    let _materias23 = [];
    let _creditos = 0;
    let taller2Usada = false;

    const creditos86 = materias86.map(m => m.creditos).reduce((a, b) => a + b, 0);

    const tieneMaterias = (materias) => {
      return materias.every(materia => materias86.map(m => m.nombre).includes(materia))
    };

    MATERIAS_PLAN_23.forEach(materia => {
      if (materia.equivalencias === undefined) return;

      for (let i = 0; i < materia.equivalencias.length; i++) {
        if (materia.equivalencias[i].creditosNecesarios !== undefined && materia.equivalencias[i].creditosNecesarios <= creditos86) {
          _materias23.push(materia.nombre);
          break;
        }

        if (materia.equivalencias[i].materias.length === 0)
          continue;

        if (taller2Usada && materia.equivalencias[i].materias.includes("Taller de Programación II"))
          continue;

        if (tieneMaterias(materia.equivalencias[i].materias)) {
          _materias23.push(materia.nombre);
          _creditos += materia.equivalencias[i].creditos;

          if (materia.equivalencias[i].materias.includes("Taller de Programación II"))
            taller2Usada = true;

          break;
        }
      }
    });

    const _creditosDirectos = materias86.map(materia => materia.creditosExtra).reduce((a, b) => a + b, 0);
    setCreditosDirectos(_creditosDirectos);

    setMaterias23(_materias23);
    setCreditosTransicion(_creditos);
    setMateriasCanjeadas(canjeadas => canjeadas.filter(m => !_materias23.includes(m)))

    if (_creditosDirectos + creditosExtra + _creditos < CREDITOS_ELECTIVAS_23 + creditosCanje) {
      setMateriasCanjeadas([]);
    }
  }, [materias86, creditosCanje, creditosExtra, setMateriasCanjeadas]);

  useEffect(() => {
    setCreditos(creditosDirectos + creditosExtra + creditosTransicion);
  }, [creditosDirectos, creditosExtra, creditosTransicion]);

  useEffect(() => {
    setCreditosCanje(MATERIAS_PLAN_23.filter(m => materiasCanjeadas.includes(m.nombre)).map(m => m.canjeable).reduce((a, b) => a + b, 0));
  }, [materiasCanjeadas]);

  return (
    <>
      <Header
        aprobarObligatorias={seleccionarTodasObligatorias86}
        limpiar={limpiarTodo}
        compartir={compartir}
        readOnly={readOnly}
      />

      <ShareDialog codigo={shareCode} creditos={creditosExtra} canje={canjeShareCode} open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} />

      <Box sx={{ flexGrow: 1 }} padding={2} marginTop={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ padding: "3em", marginBottom: "2em" }}>
              <h3>Obligatorias</h3>
              <FormGroup>
                {materias_plan86.obligatorias.map((materia, idx) =>
                  <Materia86
                    key={`${materia.nombre}-86`}
                    materia={materia}
                    checked={materias86.some(m => m.nombre === materia.nombre)}
                    onCheck={agregarMateria86}
                    onUncheck={eliminarMateria86}
                    disabled={readOnly}
                  />
                )}
              </FormGroup>
            </Paper>
            <Paper elevation={0} sx={{ padding: "3em", marginBottom: "2em" }}>
              <h3>Orientación</h3>
              {materias_plan86.orientaciones.map((orientacion, idx) =>
                <FormGroup key={orientacion.nombre} sx={{ marginBottom: "1em" }}>
                  <FormLabel>{orientacion.nombre}</FormLabel>
                  {orientacion.materias.map((materia, idx) =>
                    <Materia86
                      key={`${materia.nombre}-86`}
                      materia={materia}
                      checked={materias86.some(m => m.nombre === materia.nombre)}
                      onCheck={agregarMateria86}
                      onUncheck={eliminarMateria86}
                      disabled={readOnly}
                    />
                  )}
                </FormGroup>
              )}
            </Paper>
            <Paper elevation={0} sx={{ padding: "3em", marginBottom: "2em" }}>
              <h3>Créditos extra</h3>
              <ExtraCredits value={creditosExtra} setValue={setCreditosExtra} disabled={readOnly} />
              <Typography variant='caption'>Agregá acá si tenés créditos extra obtenidos por fuera del plan.</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ padding: "3em", marginBottom: "2em" }}>
              <h3>Electivas</h3>
              <FormGroup>
                {materias_plan86.electivas.map(materia =>
                  <Materia86
                    key={`${materia.nombre}-86`}
                    materia={materia}
                    checked={materias86.some(m => m.nombre === materia.nombre)}
                    onCheck={agregarMateria86}
                    onUncheck={eliminarMateria86}
                    disabled={readOnly}
                  />
                )}
              </FormGroup>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ padding: "3em", marginBottom: "2em" }}>
              <h3>Plan 2023</h3>
              <FormGroup>
                {MATERIAS_PLAN_23.map(materia =>
                  <Materia23
                    key={`${materia.nombre}-23`}
                    materia={materia}
                    checked={materias23.includes(materia.nombre) || materiasCanjeadas.includes(materia.nombre)}
                  />
                )}
                <FormControlLabel
                  control={
                    <Checkbox
                      onClick={e => e.preventDefault()}
                      indeterminate={creditos > 0 && creditos < CREDITOS_ELECTIVAS_23}
                      checked={creditos >= CREDITOS_ELECTIVAS_23}
                    />
                  }
                  label={`Electivas: ${(creditos <= CREDITOS_ELECTIVAS_23) ? creditos : CREDITOS_ELECTIVAS_23}/${CREDITOS_ELECTIVAS_23}`}
                />
              </FormGroup>
              {
                (creditos > CREDITOS_ELECTIVAS_23) ?
                  `Créditos sobrantes: ${creditos - CREDITOS_ELECTIVAS_23 - creditosCanje}` :
                  null
              }
            </Paper>

            {creditos >= CREDITOS_ELECTIVAS_23 + MIN_CREDITOS_CANJE ?
              <Paper elevation={0} sx={{ padding: "3em", marginBottom: "2em" }}>
                <h3>Canje por trayectoria académica</h3>
                <Typography variant='caption'>Si ves esto es porque te sobran {MIN_CREDITOS_CANJE} o más créditos. En este caso, podés elegir alguna(s) de las siguientes materias para canjear por esos créditos.</Typography>
                <FormGroup>
                  {MATERIAS_PLAN_23.filter(m => m.canjeable).map(materia =>
                    <Canje
                      key={`${materia.nombre}-23-canje`}
                      materia={materia}
                      checked={materiasCanjeadas.includes(materia.nombre) || materias23.includes(materia.nombre)}
                      aprobada={materias23.includes(materia.nombre)}
                      disponible={
                        (
                          creditos - creditosCanje - CREDITOS_ELECTIVAS_23 >= materia.canjeable
                          || materiasCanjeadas.includes(materia.nombre)
                        ) && !readOnly
                      }
                      onCheck={(m) => setMateriasCanjeadas(materiasCanjeadas.concat(m.nombre))}
                      onUncheck={(m) => setMateriasCanjeadas(materiasCanjeadas.filter(mat => mat !== m.nombre))}
                    />
                  )}
                </FormGroup>
              </Paper>
              : null
            }
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

export default App;
