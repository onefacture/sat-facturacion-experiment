// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const fs             = require('fs');
const modalWebview   = document.getElementById('modalWebview');
const satWebview     = document.getElementById('satWebview');
const mainForm       = document.getElementById('main-form');
const loaderMessage  = document.getElementById('loader-message');

const URLS = {
    portalcfdi:  'https://portalcfdi.facturaelectronica.sat.gob.mx',
    logout:      'https://portalcfdi.facturaelectronica.sat.gob.mx/logout.aspx?salir=y',
    credentials: 'https://cfdiau.sat.gob.mx/nidp/wsfed/ep?id=SATUPCFDiCon&sid=0&option=credential&sid=0',
    fiel:        'https://cfdiau.sat.gob.mx/nidp/app/login?id=SATx509Custom&sid=2&option=credential&sid=2',
    facturaelectronica: 'https://pacsat.facturaelectronica.sat.gob.mx/Comprobante/CapturarComprobante',
};

satWebview.src = URLS.portalcfdi;

const SatWebviewService = (function({ onready }) {

    function clickSatPageButton(selector, miliseconds) {
        satWebview.executeJavaScript(`
            setTimeout(function() {
                $('${selector}').click();
            }, ${miliseconds || 100});
        `);
    }

    function clickGoToFielPage() {
        clickSatPageButton('#buttonFiel', 100);
    }

    const LoginService = (function() {

        let _rfc                = null;
        let _certificate        = null;
        let _privateKey         = null;
        let _privateKeyPassword = null;

        function setFielLoginPage({ onready }) {
            try {
                if(satWebview.src.indexOf('SATUPCFDiCon') > 0) {
                    clickSatPageButton('#buttonFiel', 2000);
                } else if(satWebview.src.indexOf('SATx509') > 0) {
                    console.log('%cYa se puede iniciar sesión.', 'color: green; font-weight: bold;font-size: 23px;');
                    onready && onready();
                    satWebview.executeJavaScript(`
                        validate         = () => true;
                        validaRequeridos = () => '';
                        ipcRenderer.sendToHost(
                            JSON.stringify({
                                type: 'succes'
                            })
                        );
                    `);
                } else if(
                    satWebview.src.indexOf('wsfed_portalCFDI.jsp') > 0 ||
                    satWebview.src.indexOf('wsfed_pacsat.jsp') > 0 ||
                    satWebview.src.indexOf('lofc.jsp') > 0
                ) {
                    satWebview.src = URLS.portalcfdi;
                } else if(satWebview.src === 'https://portalcfdi.facturaelectronica.sat.gob.mx/') {
                    satWebview.src = URLS.facturaelectronica;
                } else if(satWebview.src === URLS.facturaelectronica) {
                    modalWebview.classList.toggle('is-active');
                } else {
                    console.log(satWebview.src);
                }
            } catch (e) {
                console.error(e)
            }
        }

        function setAndValidateCert({ certificate }) {
            if(!certificate) {
                throw 'setAndValidateCert: Bad implementation';
            }

            _certificate = certificate;

            satWebview.executeJavaScript(`
                window.Certificate = '${certificate}';
                try {
                    cargaCert();
                } catch(e) {
                    ipcRenderer.sendToHost(
                        JSON.stringify({
                            type: 'CARGA_CERT_ERROR'
                        })
                    );
                }
            `);
        }

        function setRfc({ rfc }) {
            if(!rfc) {
                throw 'setRfc: Bad implementation';
            }

            _rfc = rfc;

            satWebview.executeJavaScript(`
                document.getElementById('rfc').value = '${rfc}';
            `);
        }

        function setPrivateKey({ privateKey }) {
            if(!privateKey) {
                throw 'setPrivateKey: Bad implementation';
            }

            _privateKey = privateKey;
        }

        function validatePrivateKey({ privateKeyPassword }) {
            if(!privateKeyPassword) {
                throw 'validatePrivateKey: Bad implementation';
            }

            satWebview.executeJavaScript(`
                window.PrivateKey                                   = '${_privateKey}';
                document.getElementById('privateKeyPassword').value = '${privateKeyPassword}';

                try {
                    cargaLlave(window.PrivateKey, '${privateKeyPassword}');
                    firmar();
                } catch(e) {
                    ipcRenderer.sendToHost(
                        JSON.stringify({
                            type: 'CARGA_KEY_ERROR', e
                        })
                    );
                }
            `);
        }

        return {
            validatePrivateKey,
            setAndValidateCert,
            setFielLoginPage,
            setPrivateKey,
            setRfc,
        };

    })();

    function init() {
        // Evento disparado cada vez que se recarga el webview
        satWebview.addEventListener('dom-ready', () => {
            // Ir al login de FIEL si no hay sesión
            LoginService.setFielLoginPage({ onready });
        });

        // Evento disparado cuando recibe un evento desde el webview
        satWebview.addEventListener('ipc-message', event => {
            try {
                const dataChannel = JSON.parse(event.channel);
                switch(dataChannel.type) {
                    case 'CARGA_CERT_ERROR':
                        console.error('CARGA_CERT_ERROR', dataChannel);
                        break;
                    case 'CARGA_KEY_ERROR':
                        console.error('CARGA_KEY_ERROR',  dataChannel);
                        break;
                    case 'AUTH_ERROR':
                        console.error('AUTH_ERROR',       dataChannel);
                        break;
                }
            } catch(e) {
                console.error(e);
            }
        })
    }

    return {
        LoginService,
        clickGoToFielPage,
        init
    };
})({ onready });

function onready() {
    mainForm.classList.toggle('is-hidden');
    loaderMessage.classList.toggle('is-hidden');
}

SatWebviewService.init();

function handleInputFile(inputFile) {
    var dataBase64 = fs.readFileSync(inputFile.files[0].path, 'base64');

    if(inputFile.name === 'certificate') {
        SatWebviewService.LoginService.setAndValidateCert({
            certificate: dataBase64
        });
    } else if(inputFile.name === 'privateKey') {
        SatWebviewService.LoginService.setPrivateKey({
            privateKey: dataBase64
        });
    }
}

function doLogin(e) {
    e.preventDefault();

    SatWebviewService.LoginService.validatePrivateKey({
        privateKeyPassword: document.getElementById('password').value
    });

    console.log('Porcesando login...');
}

mainForm.addEventListener('submit', doLogin);
