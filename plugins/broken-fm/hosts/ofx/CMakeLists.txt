include(FetchContent)

set(OPENFX_ROOT "" CACHE PATH "Path to an OpenFX SDK checkout")
if(NOT OPENFX_ROOT)
  FetchContent_Declare(openfx_sdk
    GIT_REPOSITORY https://github.com/AcademySoftwareFoundation/openfx.git
    GIT_TAG ab779510b2655b4d11a7e01e5c521f9aa8c88976)
  FetchContent_GetProperties(openfx_sdk)
  if(NOT openfx_sdk_POPULATED)
    FetchContent_Populate(openfx_sdk)
  endif()
  set(OPENFX_ROOT "${openfx_sdk_SOURCE_DIR}")
endif()
if(NOT EXISTS "${OPENFX_ROOT}/include/ofxImageEffect.h")
  message(FATAL_ERROR "OPENFX_ROOT does not contain the OpenFX headers")
endif()

set(NLOHMANN_JSON_ROOT "" CACHE PATH "Path to a nlohmann/json checkout")
if(NLOHMANN_JSON_ROOT)
  add_library(BrokenFmNlohmannJson INTERFACE)
  target_include_directories(BrokenFmNlohmannJson INTERFACE "${NLOHMANN_JSON_ROOT}/include")
  set(BROKEN_FM_JSON_TARGET BrokenFmNlohmannJson)
else()
  FetchContent_Declare(nlohmann_json_source
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3)
  FetchContent_MakeAvailable(nlohmann_json_source)
  set(BROKEN_FM_JSON_TARGET nlohmann_json::nlohmann_json)
endif()

set(BROKEN_FM_BUNDLE "${CMAKE_BINARY_DIR}/bundle/BrokenFM.ofx.bundle")
set(BROKEN_FM_PLUGIN_DIR "${BROKEN_FM_BUNDLE}/Contents/Win64")
add_library(BrokenFmOFX MODULE src/broken_fm_ofx.cpp)
target_compile_features(BrokenFmOFX PRIVATE cxx_std_17)
target_include_directories(BrokenFmOFX PRIVATE "${OPENFX_ROOT}/include")
target_link_libraries(BrokenFmOFX PRIVATE BrokenFmCore ${BROKEN_FM_JSON_TARGET} shell32 ole32)
target_compile_definitions(BrokenFmOFX PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)
if(MSVC)
  target_link_options(BrokenFmOFX PRIVATE /NODEFAULTLIB:LIBCMT)
endif()
set_target_properties(BrokenFmOFX PROPERTIES PREFIX "" OUTPUT_NAME "BrokenFM" SUFFIX ".ofx"
  LIBRARY_OUTPUT_DIRECTORY "${BROKEN_FM_PLUGIN_DIR}" RUNTIME_OUTPUT_DIRECTORY "${BROKEN_FM_PLUGIN_DIR}"
  LIBRARY_OUTPUT_DIRECTORY_RELEASE "${BROKEN_FM_PLUGIN_DIR}" RUNTIME_OUTPUT_DIRECTORY_RELEASE "${BROKEN_FM_PLUGIN_DIR}")

configure_file(resources/Info.plist.in "${BROKEN_FM_BUNDLE}/Contents/Info.plist" @ONLY)
