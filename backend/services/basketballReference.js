const axios=require('axios')
const cheerio=require('cheerio')
const cache=require('../utils/fetchWithCache')
const ROOT='https://www.basketball-reference.com'
function document(html) {
    return cheerio.load(html.replace(/<!--([\s\S]*?)-->/g,(_,body)=>/<table|data_grid|section_content/.test(body)?body:''))
}
async function page(path) {
    return cache({key:`awards-page:${path}`,ttl:3600000,fetcher:async()=>{
        const reader=process.env.BASKETBALL_REFERENCE_READER_URL
        const {data}=await axios.get(reader || `${ROOT}${path}`,{
            ...(reader?{params:{path}}:{}),timeout:reader?65000:15000,maxContentLength:8*1024*1024
        })
        if (typeof data!=='string' || !data.includes('<h1')) throw new Error('Неожиданный ответ архива')
        return data
    }})
}
module.exports={ROOT,document,page}
