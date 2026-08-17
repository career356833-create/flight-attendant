import {NextResponse} from 'next/server'
export async function POST(){return NextResponse.json({status:'not_configured',message:'Account deletion requires a separately configured privileged server function.'},{status:501})}
