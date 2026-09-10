add_library(BrokenFmCore STATIC src/core.cpp src/core_cuda.cu)
target_compile_features(BrokenFmCore PUBLIC cxx_std_17)
target_include_directories(BrokenFmCore PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
set_target_properties(BrokenFmCore PROPERTIES CUDA_STANDARD 17 CUDA_STANDARD_REQUIRED ON
  CUDA_RUNTIME_LIBRARY Shared POSITION_INDEPENDENT_CODE ON)
target_compile_options(BrokenFmCore PRIVATE
  $<$<COMPILE_LANGUAGE:CUDA>:--expt-relaxed-constexpr>
  $<$<AND:$<COMPILE_LANGUAGE:CUDA>,$<OR:$<CONFIG:Release>,$<CONFIG:RelWithDebInfo>>>:--use_fast_math>)
if(MSVC)
  target_compile_options(BrokenFmCore PRIVATE $<$<COMPILE_LANGUAGE:CXX>:/W4>)
endif()
