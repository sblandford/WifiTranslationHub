module.exports = {
    "env": {
        "browser": true,
        "prototypejs": true
    },
    "globals": {
        "AMRWB": true,
        "Float32Array": false,
        "Int16Array": false,
        "Uint8Array": false
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": "off"
    }
};
