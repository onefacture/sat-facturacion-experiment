# SAT Facturacion Experiment

Experimento para facilitar la facturación a través del portal del SAT.

## Desarrollo

```bash
npm install
npm run start
```

## Troubleshooting

* No arranca en linux

añadir al comando `start` de `package.json` un `--no-sandbox` al final. Según [esto](https://github.com/electron/electron/issues/17972) es un pedote lo del sandbox.
