module.exports = {
    apps: [
        {
            name: 'staycool-pos',
            script: 'npm',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                PORT: 8878,
            },
        },
    ],
};
