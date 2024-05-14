<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import Terminal from './components/Terminal.vue'
</script>

<template>
  <div class="flex flex-col h-screen justify-between">

    <!--Container-->
    <div class="container w-full md:max-w-3xl mx-auto pt-20">

      <div class="w-full px-4 md:px-6 text-xl text-gray-800 leading-normal" style="font-family:Georgia,serif;">

        <!--Title-->
        <div class="font-sans">
          <h1 class="font-bold font-sans break-normal text-amber-50 pt-6 pb-2 text-3xl md:text-4xl">Welcome </h1>
        </div>

        <!--Post Content-->

        <!--Lead Para-->
        <p class="py-6 text-amber-50">
          <terminal msg="Hello World!"></terminal>
        </p>

        <!--/ Post Content-->

      </div>
    </div>
    <!--/container-->

    <footer class="bg-slate-400 border-t border-gray-400 shadow">
      <div class="container max-w-4xl mx-auto flex py-8">

        <div class="w-full mx-auto flex flex-wrap">
          <div class="flex w-full md:w-1/2 ">
            <div class="px-8">
              <h3 class="font-bold text-gray-900">About</h3>
              <p class="py-4 text-gray-600 text-sm">
                The bits don't do what I want them to do.
              </p>
            </div>
          </div>

          <div class="flex w-full md:w-1/2">
            <div class="px-8">
              <h3 class="font-bold text-gray-900">Social</h3>
              <ul class="list-reset items-center text-sm pt-3">
                <li>
                  <a target="_blank" class="inline-block text-gray-600 no-underline hover:text-gray-900 hover:text-underline py-1"
                     href="https://x.com/kylewelshlive">Twitter</a>
                </li>
                <li>
                  <a target="_blank" class="inline-block text-gray-600 no-underline hover:text-gray-900 hover:text-underline py-1"
                     href="https://www.linkedin.com/in/kyle-ian-bransby-welsh/">LinkedIn</a>
                </li>
                <li>
                  <a target="_blank" class="inline-block text-gray-600 no-underline hover:text-gray-900 hover:text-underline py-1"
                     href="https://www.instagram.com/kylewelshlive/">Instagram</a>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </footer>

  </div>
</template>

<style></style>
