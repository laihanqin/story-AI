export interface CharacterInfo {
  id: number;
  role: string;
  img: string;
}

export const CHARACTER_LIST: CharacterInfo[] = [
  { id: 1, role: '孙悟空', img: '/角色1-孙悟空.png' },
  { id: 2, role: '灰姑娘', img: '/角色2-灰姑娘.png' },
  { id: 3, role: '粉红小猪', img: '/角色3-粉红小猪.png' },
  { id: 4, role: '小小超人', img: '/角色4-小小超人.png' },
  { id: 5, role: '公主', img: '/角色5-公主.png' },
  { id: 6, role: '小恐龙', img: '/角色6-小恐龙.png' },
  { id: 7, role: '小熊猫', img: '/角色7-小熊猫.png' },
  { id: 8, role: '小魔法师', img: '/角色8-小魔法师.png' },
];

export const CHARACTER_NAMES: string[] = CHARACTER_LIST.map(c => c.role);

export function getCharacterImg(role: string): string {
  return CHARACTER_LIST.find(c => c.role === role)?.img || '';
}
