export async function register() {
  // Lembretes de foto sem parecer da doutora (lib/triagem.ts): o relógio
  // precisa existir desde o boot, não só depois da próxima foto.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { iniciarRelogioTriagem } = await import('./lib/triagem')
    iniciarRelogioTriagem()
  }
}

export const onRequestError = (err: any) => {
  console.error(err);
};
