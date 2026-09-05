import { redirect } from 'next/navigation'

// Existiam duas políticas de privacidade diferentes: esta, feita para o Meta
// App Review, e a de /privacidade. Duas versões do mesmo documento é risco de
// se contradizerem na análise. O conteúdo do Instagram foi para /privacidade e
// esta URL segue viva porque já pode estar cadastrada no painel da Meta.
export default function PrivacidadeLegal() {
    redirect('/privacidade')
}
