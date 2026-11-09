<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import LoginView from './views/LoginView.vue';
import RegisterView from './views/RegisterView.vue';
import FamilyView from './views/FamilyView.vue';
import AdminView from './views/AdminView.vue';
import AppModals from './components/AppModals.vue';
import { useRegistry } from './composables/useRegistry';

// App.vue مسؤول فقط عن اختيار الصفحة المناسبة.
// جميع البيانات والعمليات موجودة في useRegistry، وكل واجهة موجودة في ملف مستقل.
const { view, toast, convertTaaMarbuta } = useRegistry();
</script>

<template>
  <div class="app-shell" :class="{dashboard:view==='admin'}" @input.capture="convertTaaMarbuta">
    <!-- رسالة نجاح أو خطأ موحدة لكل الصفحات. -->
    <Transition name="toast">
      <div v-if="toast" class="toast"><Check :size="18"/>{{ toast }}</div>
    </Transition>

    <!-- نعرض صفحة واحدة حسب حالة المستخدم الحالية. -->
    <LoginView v-if="view==='login'"/>
    <RegisterView v-else-if="view==='register'"/>
    <FamilyView v-else-if="view==='family'"/>
    <AdminView v-else/>

    <!-- النوافذ المشتركة تبقى متاحة فوق أي صفحة. -->
    <AppModals/>
  </div>
</template>

