export const simulators=[
 {id:'body',href:'/simulators/body',number:'01',title:'전신 디지털 트윈',en:'WHOLE-BODY ANATOMY',image:'/thumbnails/body.jpg',alt:'전신 골격, 순환계와 장기를 겹쳐 표시한 SOMA 해부학 모델',description:'신체 구조와 움직임을 살펴보고, 센싱 위치와 생리 조건을 바꾸며 합성 신호를 탐색합니다.',features:['6개 신체 계통 · 투명도 제어','걷기·달리기·손 쥐기·자세 전환','12개 피부 부위 · 3D 조직 단면','ECG·PPG·EEG·EMG·호흡 · CSV'],status:'실행 가능',action:'전신 트윈 열기'},
 {id:'sleep',href:'/simulators/sleep',number:'02',title:'수면무호흡',en:'SLEEP & RESPIRATORY SENSING',image:'/thumbnails/sleep.svg',alt:'명치의 세 전극과 호흡, 심전도 신호',description:'명치 패치의 정전용량·ECG·가속도로 호흡을 추정하고, 침대 자세와 외부 채널을 함께 실험합니다.',features:['명치 3전극 · 폐 역학 · 합성 신호','선택형 호흡수 융합 · 아티팩트 분류','왼쪽·오른쪽 수면 · 연속 뒤척이기','소켓 입력 · 오디오·영상·레이더'],status:'호흡 노력 · 가상 실험',action:'수면 실험 열기'},
] as const;
