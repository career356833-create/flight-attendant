import {airlineMaster,airlineMasterById,type AirlineMaster} from './airline-master-data'

export type PriorityTier='A'|'B'|'C'
export type AirlinePriorityProfile={airlineId:string;priorityTier:PriorityTier;priorityScore:number;selectionReasons:string[];targetUsers:string[];recommendedResearchOrder:number;researchPriority:number}
type Candidate={id:string;tier:PriorityTier;targets:string[];reasons:string[]}

const candidates:Candidate[]=[
 {id:'emirates',tier:'A',targets:['외항사 준비생','글로벌 취업 희망','영어 면접 준비자'],reasons:['한국 지원자 관심도가 높고 글로벌 채용 준비 가치가 큼']},
 {id:'qatar_airways',tier:'A',targets:['외항사 준비생','중동 항공사 관심','영어 면접 준비자'],reasons:['중동 글로벌 채용과 영어 평가 준비에 유용']},
 {id:'etihad_airways',tier:'A',targets:['외항사 준비생','글로벌 취업 희망','서비스 역량 강화'],reasons:['프리미엄 서비스와 글로벌 지원 준비를 함께 다룰 수 있음']},
 {id:'singapore_airlines',tier:'A',targets:['외항사 준비생','아시아 글로벌 항공사 관심','서비스 면접 준비자'],reasons:['아시아권 글로벌 서비스 직무 연구 가치가 큼']},
 {id:'cathay_pacific',tier:'A',targets:['외항사 준비생','홍콩·아시아 노선 관심','다국어 환경 준비자'],reasons:['다문화 고객 응대와 아시아 네트워크 연구에 적합']},
 {id:'korean_air',tier:'A',targets:['국내 대형항공사 준비','한국 채용 준비'],reasons:['한국 지원자 관심과 국내 채용 준비의 기준점']},
 {id:'asiana_airlines',tier:'A',targets:['국내 대형항공사 준비','한국 채용 준비'],reasons:['국내 대형항공사 지원 흐름과 서비스 역량 비교에 유용']},
 {id:'ana',tier:'A',targets:['일본 항공사 준비','아시아 글로벌 항공사 관심','서비스 면접 준비자'],reasons:['일본·아시아권 채용 준비와 서비스 기준 연구에 적합']},
 {id:'japan_airlines',tier:'A',targets:['일본 항공사 준비','아시아 글로벌 항공사 관심'],reasons:['일본 항공사 지원 방향과 직무 이해를 비교하기 좋음']},
 {id:'air_premia',tier:'A',targets:['신규 항공사 관심','장거리 취항 관심','한국 채용 준비'],reasons:['성장 항공사와 장거리 하이브리드 환경 연구 가치']},
 {id:'delta_air_lines',tier:'B',targets:['미국 항공사 준비','글로벌 취업 희망'],reasons:['북미 대형항공사 준비와 영어 직무 맥락에 유용']},
 {id:'united_airlines',tier:'B',targets:['미국 항공사 준비','글로벌 취업 희망'],reasons:['북미 네트워크 항공사 준비를 위한 비교 기준']},
 {id:'american_airlines',tier:'B',targets:['미국 항공사 준비','영어 면접 준비자'],reasons:['북미 지원 자료와 면접 준비 확장성이 큼']},
 {id:'lufthansa',tier:'B',targets:['유럽 항공사 준비','다국어 환경 준비자'],reasons:['유럽 네트워크 항공사와 다국어 환경 연구에 적합']},
 {id:'air_france',tier:'B',targets:['유럽 항공사 준비','서비스 면접 준비자'],reasons:['유럽 프리미엄 서비스 환경을 비교할 수 있음']},
 {id:'british_airways',tier:'B',targets:['유럽 항공사 준비','영어 면접 준비자'],reasons:['영어권 유럽 항공사 준비 기준으로 활용 가능']},
 {id:'turkish_airlines',tier:'B',targets:['유럽·중동 항공사 관심','글로벌 취업 희망'],reasons:['유럽과 중동을 잇는 글로벌 네트워크 연구 가치']},
 {id:'eva_air',tier:'B',targets:['대만·아시아 항공사 관심','서비스 면접 준비자'],reasons:['아시아 프리미엄 항공사 비교에 유용']},
 {id:'china_airlines',tier:'B',targets:['대만·아시아 항공사 관심','다국어 환경 준비자'],reasons:['중화권 항공사 지원 환경 비교에 활용 가능']},
 {id:'thai_airways',tier:'B',targets:['태국·아시아 항공사 관심','서비스 면접 준비자'],reasons:['동남아 네트워크와 서비스 직무 연구에 적합']},
 {id:'flynas',tier:'C',targets:['중동 신흥 항공사 관심','성장 항공사 준비'],reasons:['Riyadh Air 후보는 Master ID가 없어 중동 성장 항공사 대체 후보로 선정']},
 {id:'saudia',tier:'C',targets:['중동 항공사 관심','글로벌 취업 희망'],reasons:['중동 지역 항공사 준비와 시장 비교에 유용']},
 {id:'zipair',tier:'C',targets:['일본 LCC·신규 항공사 관심','장거리 취항 관심'],reasons:['신규 저비용 장거리 모델 연구에 적합']},
 {id:'indigo',tier:'C',targets:['인도 항공사 관심','성장 시장 준비'],reasons:['Akasa Air 후보는 Master ID가 없어 인도 성장 시장 대체 후보로 선정']},
 {id:'air_india_express',tier:'C',targets:['인도 항공사 관심','LCC 준비'],reasons:['인도 후보군의 실제 Master 항목으로 시장 확장 연구 가능']},
 {id:'vietjet_air',tier:'C',targets:['베트남·동남아 항공사 관심','LCC 준비'],reasons:['Vietnam Airlines 후보는 Master ID가 없어 베트남 실제 등록 항공사로 대체']},
 {id:'malaysia_airlines',tier:'C',targets:['말레이시아·동남아 항공사 관심','글로벌 취업 희망'],reasons:['동남아 네트워크 항공사 연구에 적합']},
 {id:'qantas',tier:'C',targets:['호주 항공사 준비','장거리 취항 관심'],reasons:['호주 대표 네트워크와 장거리 환경 연구에 유용']},
 {id:'air_canada',tier:'C',targets:['캐나다 항공사 준비','다국어 환경 준비자'],reasons:['북미 다국어·국제선 환경 비교에 활용 가능']},
 {id:'starlux_airlines',tier:'C',targets:['신규 프리미엄 항공사 관심','대만·아시아 항공사 관심'],reasons:['Master에 등록된 신생 프리미엄 항공사로 성장성 연구에 적합']},
]

const globalValueScore=(value:AirlineMaster['globalValue'])=>value==='high'?100:value==='medium'?65:35
const dataAvailabilityScore=(value:AirlineMaster['dataAvailability'])=>value==='reviewable'?100:value==='seeded'?80:45
function score(master:AirlineMaster){return Math.round(master.score.koreanApplicantDemand*.4+master.score.recruitmentAccessibility*.25+globalValueScore(master.globalValue)*.2+dataAvailabilityScore(master.dataAvailability)*.15)}
function makeProfile(candidate:Candidate,index:number):AirlinePriorityProfile|null{const master=airlineMasterById.get(candidate.id);if(!master)return null;const priorityScore=score(master),masterReasons=[`Master 점수 기준 한국 지원자 관심도 ${master.score.koreanApplicantDemand}`,`채용 접근성 ${master.score.recruitmentAccessibility}`,`글로벌 취업 가치 ${master.globalValue}`,`데이터 가용성 ${master.dataAvailability}`];return{airlineId:master.id,priorityTier:candidate.tier,priorityScore,selectionReasons:[...candidate.reasons,...masterReasons],targetUsers:candidate.targets,recommendedResearchOrder:index+1,researchPriority:index+1}}
export const airlineTopPriority:AirlinePriorityProfile[]=candidates.map((candidate,index)=>makeProfile(candidate,index)).filter((item):item is AirlinePriorityProfile=>!!item)
export const unresolvedTopCandidates=candidates.filter(candidate=>!airlineMasterById.has(candidate.id)).map(candidate=>({requestedId:candidate.id,reason:'AirlineMaster에 해당 id가 없어 이름 매칭으로 생성하지 않음'}))
export function validateAirlineTopPriority(items=airlineTopPriority){const ids=new Set<string>();const errors:string[]=[];for(const item of items){if(ids.has(item.airlineId))errors.push(`duplicate airlineId: ${item.airlineId}`);ids.add(item.airlineId);if(!airlineMasterById.has(item.airlineId))errors.push(`missing master id: ${item.airlineId}`);if(item.priorityScore<0||item.priorityScore>100)errors.push(`score out of range: ${item.airlineId}`);if(item.recommendedResearchOrder<1||item.recommendedResearchOrder>30)errors.push(`research order out of range: ${item.airlineId}`)}return errors}
