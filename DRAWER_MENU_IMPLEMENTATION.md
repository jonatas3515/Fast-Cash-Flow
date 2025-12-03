# Implementação do Menu Lateral (Drawer/Sidebar)

## ✅ Implementação Concluída

Foi implementado um menu lateral interativo (drawer/sidebar) totalmente funcional para Android e Web, substituindo a navegação por abas inferior.

## 📋 O que foi implementado

### 1. **Dependências Instaladas**
- `@react-navigation/drawer` - Biblioteca oficial para navegação com drawer

### 2. **Componentes Criados**

#### **CustomDrawerContent.tsx** (Para usuários empresas)
- Cabeçalho personalizado com:
  - Logo da empresa (configurável)
  - Nome da empresa
  - Email do usuário logado
- Menu de navegação com ícones:
  - 🏠 Dashboard
  - 💸 Lançamentos
  - 📊 Relatórios
  - 💳 Débitos
  - 🔁 Recorrentes
  - ⚙️ Configurações
- Opções adicionais:
  - Alternar tema (claro/escuro)
  - Botão de sair
- Rodapé com versão e suporte

#### **CustomAdminDrawerContent.tsx** (Para administradores)
- Cabeçalho com logo Fast Cash Flow
- Badge de administrador (👑)
- Menu de navegação:
  - 🏢 Empresas
  - 📥 Solicitações
  - 💳 Débitos
  - 📊 Relatórios
  - ⚙️ Configurações
- Mesmas opções de tema e logout

### 3. **Navegação Atualizada**

#### **Tabs.tsx** (Empresas)
- Substituído `createBottomTabNavigator` por `createDrawerNavigator`
- Header customizado com:
  - Botão hambúrguer (☰) em mobile
  - Logo e título da tela
  - Botão de tema em desktop
- Configuração responsiva do drawer

#### **AdminTabs.tsx** (Admin)
- Mesma estrutura do Tabs.tsx
- Header adaptado para administradores
- Mantém modal de débitos em atraso

### 4. **Temas Atualizados**

Adicionadas cores específicas para o drawer em `theme.ts`:

**Tema Claro:**
- `drawerBackground`: '#FFFFFF'
- `drawerHeaderBackground`: '#D90429' (vermelho primário)
- `drawerHeaderText`: '#FFFFFF'
- `drawerActiveBackground`: 'rgba(217, 4, 41, 0.1)'

**Tema Escuro:**
- `drawerBackground`: '#1F2937'
- `drawerHeaderBackground`: '#D90429'
- `drawerHeaderText`: '#FFFFFF'
- `drawerActiveBackground`: 'rgba(217, 4, 41, 0.15)'

## 🎨 Comportamento por Plataforma

### **Android / Mobile Web (< 1024px)**
- Menu deslizante da esquerda
- Cobre 75% da largura da tela
- Overlay escuro semi-transparente (50% opacidade)
- Fecha automaticamente ao selecionar item
- Gesto de swipe para abrir/fechar
- Botão hambúrguer visível no header

### **Desktop Web (≥ 1024px)**
- Sidebar fixa e sempre visível
- Largura de 280px
- Sem overlay
- Não fecha ao selecionar item
- Sem botão hambúrguer (menu sempre visível)
- Botão de tema no header

## 🎯 Funcionalidades Implementadas

### ✅ Estrutura e Componentes
- [x] Drawer deslizante da esquerda
- [x] Cabeçalho com logo, nome da empresa e email
- [x] Lista de navegação com ícones
- [x] Rodapé com informações

### ✅ Comportamento Android/Mobile
- [x] Ícone hambúrguer no header
- [x] Menu cobre 75% da tela
- [x] Overlay escuro
- [x] Fecha ao tocar fora
- [x] Animação suave
- [x] Área de toque confortável (min 48px)
- [x] Indicador visual de item ativo

### ✅ Comportamento Web
- [x] Mobile: igual ao Android
- [x] Desktop: sidebar fixa permanente
- [x] Hover effect nos items
- [x] Item ativo sempre destacado

### ✅ Design e Estilo
- [x] Cabeçalho com cor primária
- [x] Logo centralizada
- [x] Items com ícone + texto
- [x] Espaçamento confortável
- [x] Feedback visual ao clicar
- [x] Borda lateral colorida no item ativo
- [x] Suporte a tema claro/escuro
- [x] Responsivo em todas resoluções

### ✅ Implementação Técnica
- [x] Biblioteca @react-navigation/drawer
- [x] drawerContent customizado
- [x] Header customizado com botão menu
- [x] useNavigation para navegação
- [x] CSS condicional para web desktop
- [x] Sidebar fixa quando isWideWeb === true

## 🚀 Como Testar

1. **Iniciar o servidor:**
   ```bash
   npm start
   ```

2. **Testar no navegador (Web):**
   - Pressione `w` no terminal
   - Teste em diferentes tamanhos de tela:
     - Mobile (< 768px): menu deslizante
     - Desktop (≥ 1024px): sidebar fixa

3. **Testar no Android:**
   - Pressione `a` no terminal
   - Ou escaneie o QR code com Expo Go

## 📱 Navegação

### Usuários Empresas
- Dashboard → Painel gerencial
- Lançamentos → Registro de transações
- Relatórios → Análises e gráficos
- Débitos → Dívidas e parcelas
- Recorrentes → Despesas recorrentes
- Configurações → Ajustes do app

### Administradores
- Empresas → Gerenciar empresas
- Solicitações → Pedidos de cadastro
- Débitos → Débitos administrativos
- Relatórios → Relatórios gerais
- Configurações → Configurações admin

## 🎨 Customização

### Alterar Cores do Drawer
Edite `src/theme.ts`:
```typescript
drawerBackground: '#SUA_COR',
drawerHeaderBackground: '#SUA_COR',
drawerActiveBackground: 'rgba(R, G, B, 0.1)',
```

### Adicionar Novo Item ao Menu
Edite `CustomDrawerContent.tsx`:
```typescript
const menuItems = [
  // ... items existentes
  { name: 'NovoItem', label: 'Novo Item', icon: '🆕' },
];
```

E adicione a screen em `Tabs.tsx`:
```typescript
<Drawer.Screen 
  name="NovoItem" 
  component={NovoItemScreen}
  options={{
    header: () => <CustomHeader title="Novo Item" />,
  }}
/>
```

### Ajustar Largura do Drawer
Em `Tabs.tsx` ou `AdminTabs.tsx`:
```typescript
drawerStyle: {
  width: isWideWeb ? 300 : width * 0.8, // Ajuste aqui
}
```

## 📝 Notas Importantes

1. **Tela de Instruções**: Mantida no drawer mas oculta do menu (drawerItemStyle: { display: 'none' })
2. **Compatibilidade**: Funciona em Android, iOS e Web
3. **Performance**: Animações otimizadas para 60fps
4. **Acessibilidade**: Áreas de toque adequadas (min 48px)
5. **Responsividade**: Adapta-se automaticamente ao tamanho da tela

## 🐛 Troubleshooting

**Menu não abre no Android:**
- Verifique se `swipeEnabled` está `true`
- Teste com o botão hambúrguer

**Sidebar não fica fixa no desktop:**
- Verifique se `isWideWeb` está sendo calculado corretamente
- Confirme que `drawerType` está como `'permanent'`

**Cores não aparecem:**
- Verifique se o tema foi atualizado em `theme.ts`
- Confirme que está usando `theme.drawerBackground` etc.

## ✨ Melhorias Futuras (Opcionais)

- [ ] Badge com contador de notificações
- [ ] Reordenar items do menu
- [ ] Busca rápida no menu
- [ ] Animações mais elaboradas
- [ ] Suporte a gestos avançados

---

**Versão:** 1.0.0  
**Data:** Novembro 2024  
**Status:** ✅ Implementado e Funcional
